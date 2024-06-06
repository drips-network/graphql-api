import type {
  Forge,
  ResolverClaimedProjectChainData,
  ResolverProject,
  ResolverUnClaimedProjectChainData,
} from '../common/types';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { ProjectDataValues } from './ProjectModel';
import { ProjectVerificationStatus } from './ProjectModel';
import assert from '../utils/assert';
import appSettings from '../common/appSettings';
import { getCrossChainRepoDriverAccountIdByAddress } from '../common/dripsContracts';
import { Driver } from '../generated/graphql';
import type {
  Forge as GraphQlForge,
  SupportedChain,
  Splits,
} from '../generated/graphql';

export function splitProjectName(projectName: string): {
  ownerName: string;
  repoName: string;
} {
  const components = projectName.split('/');

  if (components.length !== 2) {
    throw new Error(`Invalid project name: ${projectName}.`);
  }

  return { ownerName: components[0], repoName: components[1] };
}

export async function doesRepoExists(url: string) {
  if (appSettings.pretendAllReposExist) return true;

  const res = await fetch(url);

  return res.status === 200;
}

export function toApiProject(project: ProjectDataValues) {
  if (!project) {
    return null;
  }

  if (!project.isValid) {
    throw new Error('Project not valid.');
  }

  if (!(project.name && project.forge)) {
    // Means that the relevant `OwnerUpdateRequested` event has not been processed yet.
    return null;
  }

  if (project.verificationStatus === ProjectVerificationStatus.Claimed) {
    return project;
  }

  return toFakeUnclaimedProject(project);
}

function toForge(forge: string): Forge {
  switch (forge.toLocaleLowerCase()) {
    case 'github':
      return `GitHub`;
    case 'gitlab':
      return `GitLab`;
    default:
      return shouldNeverHappen(`Forge ${forge} not supported.`);
  }
}

export async function toFakeUnclaimedProjectFromUrl(url: string) {
  const pattern =
    /^(?:https?:\/\/)?(?:www\.)?(github|gitlab)\.com\/([^\/]+)\/([^\/]+)/; // eslint-disable-line no-useless-escape
  const match = url.match(pattern);

  if (!match) {
    throw new Error(`Unsupported repository url: ${url}.`);
  }

  const forge = toForge(match[1]);
  const ownerName = match[2];
  const repoName = match[3];

  return {
    id: await getCrossChainRepoDriverAccountIdByAddress(
      forge,
      `${ownerName}/${repoName}`,
    ),
    name: `${ownerName}/${repoName}`,
    forge,
    url,
    verificationStatus: ProjectVerificationStatus.Unclaimed,
  } as ProjectDataValues;
}

function toUrl(forge: Forge, projectName: string): string {
  switch (forge) {
    case 'GitHub':
      return `https://github.com/${projectName}`;
    default:
      throw new Error(`Unsupported forge: ${forge}.`);
  }
}

export async function toFakeUnclaimedProject(
  project: ProjectDataValues,
): Promise<ProjectDataValues> {
  const { name, forge } = project;

  assert(name && forge, 'Project name and forge must be defined.');

  return {
    id: await getCrossChainRepoDriverAccountIdByAddress(forge, name),
    name,
    forge,
    url: toUrl(forge, name),
    verificationStatus: ProjectVerificationStatus.Unclaimed,
  } as ProjectDataValues;
}

export async function toResolverProject(
  chain: SupportedChain,
  project: ProjectDataValues,
) {
  return (await toResolverProjects([chain], [project]))[0];
}

export async function toResolverProjects(
  chains: SupportedChain[],
  projects: ProjectDataValues[],
): Promise<ResolverProject[]> {
  return Promise.all(
    projects.map(async (project) => {
      const chainData = await Promise.all(
        chains.map(async (chain) => {
          if (project.chain === chain) {
            return {
              chain,
              data: {
                parentProjectInfo: {
                  projectId: project.id,
                  queriedChains: chains,
                  projectChain: chain,
                },
                color: project.color,
                emoji: project.emoji,
                avatar: project.avatarCid
                  ? {
                      cid: project.avatarCid,
                    }
                  : {
                      emoji: project.emoji || '💧',
                    },
                splits: {} as Splits, // Will be populated by the resolver.
                description: project.description,
                owner: {
                  driver: Driver.ADDRESS,
                  accountId: project.ownerAccountId,
                  address: project.ownerAddress as string,
                },
                verificationStatus: project.verificationStatus,
                support: [], // Will be populated by the resolver.
                claimedAt: project.claimedAt,
                totalEarned: [], // Will be populated by the resolver.
              },
            } as ResolverClaimedProjectChainData;
          }
          const fakeUnclaimedProject = await toFakeUnclaimedProject(project);

          return {
            chain,
            data: {
              parentProjectInfo: {
                queriedChains: chains,
                projectId: fakeUnclaimedProject.id,
                projectChain: chain,
              },
              verificationStatus: fakeUnclaimedProject.verificationStatus,
              support: [], // Will be populated by the resolver.
              totalEarned: [], // Will be populated by the resolver.
            },
          } as ResolverUnClaimedProjectChainData;
        }),
      );

      return {
        account: {
          accountId: project.id,
          driver: Driver.REPO,
        },
        source: {
          url: project.url || shouldNeverHappen(),
          repoName: splitProjectName(project.name || shouldNeverHappen())
            .repoName,
          ownerName: splitProjectName(project.name || shouldNeverHappen())
            .ownerName,
          forge: (project.forge as GraphQlForge) || shouldNeverHappen(),
        },
        chainData,
      } as ResolverProject;
    }),
  );
}
