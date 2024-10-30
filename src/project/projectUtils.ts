import { ZeroAddress } from 'ethers';
import type {
  DbSchema,
  Forge,
  ResolverClaimedProjectData,
  ResolverProject,
  ResolverUnClaimedProjectData,
} from '../common/types';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { ProjectDataValues } from './ProjectModel';
import { ProjectVerificationStatus } from './ProjectModel';
import assert from '../utils/assert';
import appSettings from '../common/appSettings';
import { getCrossChainRepoDriverAccountIdByAddress } from '../common/dripsContracts';
import { Driver } from '../generated/graphql';
import type { Forge as GraphQlForge, Splits } from '../generated/graphql';
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

export function toApiProject(project: ProjectDataValues, chains: DbSchema[]) {
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

  return toProjectRepresentation(project, chains);
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

  const forge = toForge(match[1]);
  const ownerName = match[2];
  const repoName = match[3];

  return {
    id: await getCrossChainRepoDriverAccountIdByAddress(
      forge,
      `${ownerName}/${repoName}`,
      chains,
    ),
    name: `${ownerName}/${repoName}`,
    forge,
    url,
    verificationStatus: ProjectVerificationStatus.Unclaimed,
    isValid: true,
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

export async function toProjectRepresentation(
  project: ProjectDataValues,
  chains: DbSchema[],
): Promise<ProjectDataValues> {
  const { name, forge } = project;

  assert(name && forge, 'Project name and forge must be defined.');

  return {
    id: await getCrossChainRepoDriverAccountIdByAddress(forge, name, chains),
    name,
    forge,
    url: toUrl(forge, name),
    verificationStatus:
      project.verificationStatus ?? ProjectVerificationStatus.Unclaimed,
    isValid: true,
    chain: project.chain,
    ownerAddress: project.ownerAddress || ZeroAddress,
    ownerAccountId: project.ownerAccountId || '0',
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
      projectId: project.id,
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
    withdrawableBalances: [], // Will be populated by the resolver.
    latestMetadataIpfsHash: '', // Will be populated by the resolver.
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
      projectId: fakeUnclaimedProject.id,
      projectChain,
    },
    verificationStatus: fakeUnclaimedProject.verificationStatus,
    support: [], // Will be populated by the resolver.
    totalEarned: [], // Will be populated by the resolver.
    withdrawableBalances: [], // Will be populated by the resolver.
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
    if (projectsMap.has(project.id)) {
      if (!duplicates.has(project.id)) {
        duplicates.set(project.id, [projectsMap.get(project.id)!, project]);
        projectsMap.delete(project.id);
      } else {
        duplicates.get(project.id)!.push(project);
      }
    } else {
      projectsMap.set(project.id, project);
    }
  });

  const resolverProjects = await Promise.all(
    Array.from(projectsMap.values()).map(async (project) => {
      const chainData = await Promise.all(
        chains.map(async (chain) => {
          if (project.chain === chain) {
            return mapClaimedProjectChainData(project, chain, chains);
          }
          const fakeUnclaimedProject = await toProjectRepresentation(project, [
            chain,
          ]);

          return mapUnClaimedProjectChainData(
            fakeUnclaimedProject,
            chain,
            chains,
          );
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

  const mergedProject = await Promise.all(
    Array.from(duplicates.values()).map(async (p) => mergeProjects(p, chains)),
  );

  return resolverProjects.concat(mergedProject);
}

export async function mergeProjects(
  projects: ProjectDataValues[],
  chains: DbSchema[],
) {
  if (projects.some((p) => p.id !== projects[0].id)) {
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

  const mergedProject = {
    account: {
      accountId: projectBase.id,
      driver: Driver.REPO,
    },
    source: {
      url: projectBase.url || shouldNeverHappen(),
      repoName: splitProjectName(projectBase.name || shouldNeverHappen())
        .repoName,
      ownerName: splitProjectName(projectBase.name || shouldNeverHappen())
        .ownerName,
      forge: (projectBase.forge as GraphQlForge) || shouldNeverHappen(),
    },
    chainData,
  } as ResolverProject;

  return mergedProject;
}
