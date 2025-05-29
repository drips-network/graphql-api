import { ZeroAddress } from 'ethers';
import type {
  DbSchema,
  ResolverClaimedProjectData,
  ResolverProject,
  ResolverUnClaimedProjectData,
} from '../common/types';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { Forge, ProjectDataValues } from './ProjectModel';
import type { Splits } from '../generated/graphql';
import appSettings from '../common/appSettings';
import { getCrossChainRepoDriverAccountIdByAddress } from '../common/dripsContracts';
import { Driver, Forge as GraphQlForge } from '../generated/graphql';
import { singleOrDefault } from '../utils/linq';
import { dbSchemaToChain } from '../utils/chainSchemaMappings';

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

  if (project.verificationStatus === 'claimed') {
    return project;
  }

  return toProjectRepresentation(project);
}

export async function toProjectRepresentationFromUrl(
  url: string,
  chains: DbSchema[],
) {
  const pattern =
    /^(?:https?:\/\/)?(?:www\.)?(github|gitlab)\.com\/([^\/]+)\/([^\/]+)/; // eslint-disable-line no-useless-escape
  const match = url.match(pattern);

  if (!match) {
    throw new Error(`Unsupported repository url: ${url}.`);
  }

  const forge = match[1] as Forge;
  const ownerName = match[2];
  const repoName = match[3];

  return {
    accountId: await getCrossChainRepoDriverAccountIdByAddress(
      forge,
      `${ownerName}/${repoName}`,
      chains,
    ),
    name: `${ownerName}/${repoName}`,
    forge,
    url,
    verificationStatus: 'unclaimed',
    isValid: true,
    isVisible: true,
  } as ProjectDataValues;
}

function toUrl(forge: Forge, projectName: string): string {
  switch (forge) {
    case 'github':
      return `https://github.com/${projectName}`;
    default:
      throw new Error(`Unsupported forge: ${forge}.`);
  }
}

export async function toProjectRepresentation(
  project: ProjectDataValues,
): Promise<ProjectDataValues> {
  const { name, forge, accountId } = project;

  return {
    accountId: accountId || shouldNeverHappen('Project accountId is missing.'),
    name,
    forge,
    url: forge && name ? toUrl(forge, name) : null,
    verificationStatus: project.verificationStatus ?? 'unclaimed',
    isValid: true,
    isVisible: project.isVisible,
    chain: project.chain,
    ownerAddress: project.ownerAddress || ZeroAddress,
    ownerAccountId: project.ownerAccountId,
  } as ProjectDataValues;
}

export async function toResolverProject(
  chains: DbSchema[],
  project: ProjectDataValues,
) {
  const resolverProjects = await toResolverProjects(chains, [project]);

  return singleOrDefault(resolverProjects);
}

function mapClaimedProjectChainData(
  project: ProjectDataValues,
  projectChain: DbSchema,
  queriedChains: DbSchema[],
) {
  return {
    chain: dbSchemaToChain[projectChain],
    parentProjectInfo: {
      projectId: project.accountId,
      queriedChains,
      projectChain,
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
    owner: {
      driver: Driver.ADDRESS,
      accountId: project.ownerAccountId,
      address: project.ownerAddress as string,
    },
    verificationStatus: project.verificationStatus,
    support: [], // Will be populated by the resolver.
    claimedAt: project.claimedAt,
    totalEarned: [], // Will be populated by the resolver.
    withdrawableBalances: [], // Will be populated by the resolver.
    withdrawableSubAccountBalances: [], // Will be populated by the resolver.
    latestMetadataIpfsHash: '', // Will be populated by the resolver.
    lastProcessedIpfsHash: project.lastProcessedIpfsHash,
  } as ResolverClaimedProjectData;
}

function mapUnClaimedProjectChainData(
  fakeUnclaimedProject: ProjectDataValues,
  projectChain: DbSchema,
  queriedChains: DbSchema[],
) {
  return {
    chain: dbSchemaToChain[projectChain],
    parentProjectInfo: {
      queriedChains,
      projectId: fakeUnclaimedProject.accountId,
      projectChain,
    },
    verificationStatus: fakeUnclaimedProject.verificationStatus,
    support: [], // Will be populated by the resolver.
    totalEarned: [], // Will be populated by the resolver.
    withdrawableBalances: [], // Will be populated by the resolver.
    withdrawableSubAccountBalances: [], // Will be populated by the resolver.
    owner: {
      driver: Driver.ADDRESS,
      accountId: fakeUnclaimedProject.ownerAccountId || '0',
      address: (fakeUnclaimedProject.ownerAddress as string) || ZeroAddress,
    },
  } as ResolverUnClaimedProjectData;
}

export async function toResolverProjects(
  chains: DbSchema[],
  projects: ProjectDataValues[],
): Promise<ResolverProject[]> {
  const projectsMap = new Map<string, ProjectDataValues>();
  const duplicates = new Map<string, ProjectDataValues[]>();

  projects.forEach((project) => {
    if (projectsMap.has(project.accountId)) {
      if (!duplicates.has(project.accountId)) {
        duplicates.set(project.accountId, [
          projectsMap.get(project.accountId)!,
          project,
        ]);
        projectsMap.delete(project.accountId);
      } else {
        duplicates.get(project.accountId)!.push(project);
      }
    } else {
      projectsMap.set(project.accountId, project);
    }
  });

  const resolverProjects = await Promise.all(
    Array.from(projectsMap.values()).map(async (project) => {
      const chainData = await Promise.all(
        chains.map(async (chain) => {
          if (project.chain === chain) {
            return mapClaimedProjectChainData(project, chain, chains);
          }
          const fakeUnclaimedProject = await toProjectRepresentation(project);

          return mapUnClaimedProjectChainData(
            fakeUnclaimedProject,
            chain,
            chains,
          );
        }),
      );

      return {
        account: {
          accountId: project.accountId,
          driver: Driver.REPO,
        },
        source: hasSource(project)
          ? {
              url: project.url,
              repoName: splitProjectName(project.name).repoName,
              ownerName: splitProjectName(project.name).ownerName,
              forge: convertToGraphQlForge(project.forge),
            }
          : undefined,
        isVisible: project.isVisible,
        chainData,
      } as ResolverProject;
    }),
  );

  const mergedProject = await Promise.all(
    Array.from(duplicates.values()).map(async (p) => mergeProjects(p, chains)),
  );

  return resolverProjects.concat(mergedProject);
}

export async function mergeProjects(
  projects: ProjectDataValues[],
  chains: DbSchema[],
) {
  if (projects.some((p) => p.accountId !== projects[0].accountId)) {
    throw new Error('All projects should have the same id when merging.');
  }

  // It doesn't matter which project we choose as the base. This will only be used for the common, chain-agnostic, properties.
  const projectBase = projects[0];

  const chainData = [] as (
    | ResolverClaimedProjectData
    | ResolverUnClaimedProjectData
  )[];

  await Promise.all(
    chains.map(async (chain) => {
      let projectOnChain = projects.filter((p) => p.chain === chain)[0];

      if (projectOnChain?.claimedAt) {
        chainData.push(
          mapClaimedProjectChainData(projectOnChain, chain, chains),
        );
      } else {
        if (!projectOnChain) {
          projectOnChain = await toProjectRepresentationFromUrl(
            projectBase.url!,
            chains,
          );
        }

        chainData.push(
          mapUnClaimedProjectChainData(projectOnChain, chain, chains),
        );
      }
    }),
  );

  return {
    account: {
      accountId: projectBase.accountId,
      driver: Driver.REPO,
    },
    source: hasSource(projectBase)
      ? {
          url: projectBase.url,
          repoName: splitProjectName(projectBase.name).repoName,
          ownerName: splitProjectName(projectBase.name).ownerName,
          forge: convertToGraphQlForge(projectBase.forge),
        }
      : undefined,
    isVisible: projectBase.isVisible,
    chainData,
  } as ResolverProject;
}

export function convertToGraphQlForge(forge: Forge): GraphQlForge | undefined {
  switch (forge) {
    case 'github':
      return GraphQlForge.GitHub;
    case 'gitlab':
      return GraphQlForge.GitLab;
    default:
      return undefined;
  }
}

function hasSource(project: ProjectDataValues): project is ProjectDataValues & {
  forge: Forge;
  name: string;
  url: string;
} {
  return Boolean(project.forge && project.name && project.url);
}
