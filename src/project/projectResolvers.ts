import type {
  NftDriverId,
  RepoDriverId,
  ResolverClaimedProjectData,
  ResolverProject,
  ResolverUnClaimedProjectData,
} from '../common/types';
import {
  mergeProjects,
  toResolverProject,
  toResolverProjects,
} from './projectUtils';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import { Driver, ProjectVerificationStatus } from '../generated/graphql';
import type {
  RepoDriverAccount,
  AddressDriverAccount,
  ProjectWhereInput,
  ProjectSortInput,
  Avatar,
  SupportedChain,
  ProjectData,
} from '../generated/graphql';
import type { Context } from '../server';
import groupBy from '../utils/linq';
import queryableChains from '../common/queryableChains';
import type { ProjectDataValues } from './ProjectModel';
import validateProjectsInput from './projectValidators';
import type { DripListDataValues } from '../drip-list/DripListModel';
import type { LinkedIdentityDataValues } from '../linked-identity/LinkedIdentityModel';
import {
  assertIsImmutableSplitsDriverId,
  assertIsNftDriverId,
  assertIsRepoDriverId,
  assertMany,
  isGitHubUrl,
  isRepoDriverId,
} from '../utils/assert';
import { resolveTotalEarned } from '../common/commonResolverLogic';
import { validateChainsQueryArg } from '../utils/commonInputValidators';
import { toResolverDripList } from '../drip-list/dripListUtils';
import { toResolverSubList } from '../sub-list/subListUtils';
import { chainToDbSchema } from '../utils/chainSchemaMappings';
import { getLatestMetadataHashOnChain } from '../utils/getLatestAccountMetadata';
import getWithdrawableBalancesOnChain from '../utils/getWithdrawableBalances';
import getUserAddress from '../utils/getUserAddress';
import { toResolverEcosystem } from '../ecosystem/ecosystemUtils';
import { calcSubRepoDriverId } from '../utils/repoSubAccountIdUtils';

const projectResolvers = {
  Query: {
    projects: async (
      _: undefined,
      args: {
        chains?: SupportedChain[];
        where?: ProjectWhereInput;
        sort?: ProjectSortInput;
        limit?: number;
      },
      { dataSources: { projectsDataSource } }: Context,
    ): Promise<ResolverProject[]> => {
      validateProjectsInput(args);

      const { chains, where, sort, limit } = args;

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      const dbProjects = await projectsDataSource.getProjectsByFilter(
        dbSchemasToQuery,
        where,
        sort,
        limit,
      );

      return toResolverProjects(dbSchemasToQuery, dbProjects);
    },
    projectById: async (
      _: undefined,
      { id, chains }: { id: RepoDriverId; chains?: SupportedChain[] },
      { dataSources: { projectsDataSource } }: Context,
    ): Promise<ResolverProject | null> => {
      if (!isRepoDriverId(id)) {
        return null;
      }

      if (chains?.length) {
        validateChainsQueryArg(chains);
      }

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      const dbProjects = await projectsDataSource.getProjectById(
        id,
        dbSchemasToQuery,
      );

      return dbProjects ? mergeProjects(dbProjects, dbSchemasToQuery) : null;
    },
    projectByUrl: async (
      _: undefined,
      { url, chains }: { url: string; chains?: SupportedChain[] },
      { dataSources: { projectsDataSource } }: Context,
    ): Promise<ResolverProject | null> => {
      if (!isGitHubUrl(url)) {
        return null;
      }

      if (chains?.length) {
        validateChainsQueryArg(chains);
      }

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      const dbProjects = await projectsDataSource.getProjectByUrl(
        url,
        dbSchemasToQuery,
      );

      return dbProjects ? mergeProjects(dbProjects, dbSchemasToQuery) : null;
    },
    earnedFunds: async (
      _: undefined,
      {
        projectId,
        chains,
      }: { projectId: RepoDriverId; chains?: SupportedChain[] },
      { dataSources: { projectsDataSource } }: Context,
    ): Promise<
      {
        tokenAddress: string;
        amount: string;
        chain: SupportedChain;
      }[]
    > => {
      if (!isRepoDriverId(projectId)) {
        return [];
      }

      if (chains?.length) {
        validateChainsQueryArg(chains);
      }

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      return projectsDataSource.getEarnedFunds(projectId, dbSchemasToQuery);
    },
  },
  Project: {
    source: (project: ResolverProject) => project.source,
    account: (project: ResolverProject): RepoDriverAccount => project.account,
    chainData: (project: ResolverProject): ProjectData[] => project.chainData,
    isVisible: (project: ResolverProject): boolean => project.isVisible,
  },
  ProjectData: {
    __resolveType(parent: ProjectData) {
      if (parent.verificationStatus === ProjectVerificationStatus.Claimed) {
        return 'ClaimedProjectData';
      }

      return 'UnClaimedProjectData';
    },
  },
  ClaimedProjectData: {
    verificationStatus: (projectData: ResolverClaimedProjectData) =>
      projectData.verificationStatus,
    color: (projectData: ResolverClaimedProjectData): string =>
      projectData.color,
    description: (projectData: ResolverClaimedProjectData) =>
      projectData.description,
    emoji: (projectData: ResolverClaimedProjectData): string =>
      projectData.emoji || '💧',
    avatar: (projectData: ResolverClaimedProjectData): Avatar =>
      projectData.avatar,
    owner: (projectData: ResolverClaimedProjectData): AddressDriverAccount =>
      projectData.owner,
    splits: async (
      {
        parentProjectInfo: { projectId, projectChain },
      }: ResolverClaimedProjectData,
      _: {},
      {
        dataSources: {
          projectsDataSource,
          dripListsDataSource,
          splitsReceiversDataSource,
          linkedIdentitiesDataSource,
        },
      }: Context,
    ) => {
      const splitsReceivers =
        await splitsReceiversDataSource.getSplitsReceiversForSenderOnChain(
          projectId,
          projectChain,
        );

      assertMany(
        splitsReceivers.map((s) => s.relationshipType),
        (s) => s === 'project_maintainer' || s === 'project_dependency',
      );

      assertMany(
        splitsReceivers.map((s) => s.receiverAccountType),
        (s) =>
          s === 'address' ||
          s === 'project' ||
          s === 'drip_list' ||
          s === 'linked_identity',
      );

      const splitReceiversByReceiverAccountType = groupBy(
        splitsReceivers,
        (s) => s.receiverAccountType,
      );

      const addressReceivers = groupBy(
        (splitReceiversByReceiverAccountType.get('address') || []).map((s) => ({
          driver: Driver.ADDRESS,
          weight: s.weight,
          receiverType: s.receiverAccountType,
          relationshipType: s.relationshipType,
          account: {
            driver: Driver.ADDRESS,
            accountId: s.receiverAccountId,
            address: getUserAddress(s.receiverAccountId),
          },
        })),
        (s) => s.relationshipType,
      );

      const maintainers = addressReceivers.get('project_maintainer') || [];
      const addressDependencies =
        addressReceivers.get('project_dependency') || [];

      const projectReceivers =
        splitReceiversByReceiverAccountType.get('project') || [];

      const dripListReceivers =
        splitReceiversByReceiverAccountType.get('drip_list') || [];

      const linkedIdentityReceivers =
        splitReceiversByReceiverAccountType.get('linked_identity') || [];

      const projectIds =
        projectReceivers.length > 0
          ? (projectReceivers.map((r) => r.receiverAccountId) as RepoDriverId[]) // Events processors ensure that all project IDs are RepoDriverIds.
          : [];

      const linkedIdentityIds =
        linkedIdentityReceivers.length > 0
          ? (linkedIdentityReceivers.map(
              (r) => r.receiverAccountId,
            ) as RepoDriverId[]) // Events processors ensure that all linkedIdentity IDs are RepoDriverIds.
          : [];

      const [projects, dripLists, linkedIdentities] = await Promise.all([
        projectReceivers.length > 0
          ? projectsDataSource.getProjectsByIdsOnChain(projectIds, projectChain)
          : [],

        dripListReceivers.length > 0
          ? dripListsDataSource.getDripListsByIdsOnChain(
              dripListReceivers.map(
                (r) => r.receiverAccountId,
              ) as NftDriverId[],
              projectChain,
            )
          : [],

        linkedIdentityReceivers.length > 0
          ? linkedIdentitiesDataSource.getLinkedIdentitiesByIdsOnChain(
              linkedIdentityIds,
              projectChain,
            )
          : [],
      ]);

      const projectsMap = new Map(
        projects
          .filter((p): p is ProjectDataValues => p.accountId !== undefined)
          .map((p) => [p.accountId, p]),
      );

      const dripListsMap = new Map(
        dripLists
          .filter((l): l is DripListDataValues => l.accountId !== undefined)
          .map((l) => [l.accountId, l]),
      );

      const linkedIdentitiesMap = new Map(
        linkedIdentities
          .filter(
            (li): li is LinkedIdentityDataValues => li.accountId !== undefined,
          )
          .map((li) => [li.accountId, li]),
      );

      const projectDependencies = await Promise.all(
        projectReceivers.map(async (s) => {
          assertIsRepoDriverId(s.receiverAccountId);

          const project = projectsMap.get(s.receiverAccountId);
          return {
            ...s,
            driver: Driver.REPO,
            account: {
              driver: Driver.REPO,
              accountId: s.receiverAccountId,
            },
            splitsToSubAccount: s.splitsToRepoDriverSubAccount,
            project: project
              ? await toResolverProject(
                  [projectChain],
                  project as unknown as ProjectDataValues,
                )
              : undefined,
          };
        }),
      );

      const orcidDependencies = await Promise.all(
        linkedIdentityReceivers.map(async (s) => {
          assertIsRepoDriverId(s.receiverAccountId);

          const linkedIdentity = linkedIdentitiesMap.get(s.receiverAccountId);
          if (!linkedIdentity) {
            return shouldNeverHappen(
              `Expected LinkedIdentity ${s.receiverAccountId} to exist.`,
            );
          }

          return {
            ...s,
            driver: Driver.REPO,
            account: {
              driver: Driver.REPO,
              accountId: s.receiverAccountId,
            },
            linkedIdentity: {
              account: {
                driver: Driver.REPO,
                accountId: linkedIdentity.accountId,
              },
              identityType: linkedIdentity.identityType,
              owner: {
                driver: Driver.ADDRESS,
                accountId: linkedIdentity.ownerAccountId,
                address: getUserAddress(linkedIdentity.ownerAccountId),
              },
              isLinked: linkedIdentity.isLinked,
              createdAt: linkedIdentity.createdAt,
              updatedAt: linkedIdentity.updatedAt,
            },
          };
        }),
      );

      const dripListDependencies = await Promise.all(
        dripListReceivers.map(async (s) => {
          assertIsNftDriverId(s.receiverAccountId);

          const dripList = dripListsMap.get(s.receiverAccountId);
          return {
            ...s,
            driver: Driver.NFT,
            account: {
              driver: Driver.NFT,
              accountId: s.receiverAccountId,
            },
            dripList: dripList
              ? await toResolverDripList(
                  projectChain,
                  dripList as unknown as DripListDataValues,
                )
              : shouldNeverHappen(),
          };
        }),
      );

      return {
        maintainers,
        dependencies: [
          ...addressDependencies,
          ...projectDependencies,
          ...dripListDependencies,
          ...orcidDependencies,
        ],
      };
    },
    support: async (
      {
        parentProjectInfo: { projectId, projectChain },
      }: ResolverClaimedProjectData,
      _: {},
      {
        dataSources: {
          projectsDataSource,
          dripListsDataSource,
          supportDataSource,
          ecosystemsDataSource,
        },
      }: Context,
    ) => {
      const splitReceivers =
        await supportDataSource.getSplitSupportByReceiverIdOnChain(
          projectId,
          projectChain,
        );

      const support = await Promise.all(
        splitReceivers.map(async (receiver) => {
          const { senderAccountId, blockTimestamp, senderAccountType } =
            receiver;

          if (senderAccountType === 'project') {
            assertIsRepoDriverId(senderAccountId);

            return {
              ...receiver,
              account: {
                driver: Driver.REPO,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              project: await toResolverProject(
                [projectChain],
                (await projectsDataSource.getProjectByIdOnChain(
                  senderAccountId,
                  projectChain,
                )) || shouldNeverHappen(),
              ),
            };
          }
          if (senderAccountType === 'drip_list') {
            assertIsNftDriverId(senderAccountId);

            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              dripList: await toResolverDripList(
                projectChain,
                (await dripListsDataSource.getDripListById(senderAccountId, [
                  projectChain,
                ])) || shouldNeverHappen(),
              ),
            };
          }
          if (senderAccountType === 'ecosystem_main_account') {
            assertIsNftDriverId(senderAccountId);

            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              ecosystemMainAccount: await toResolverEcosystem(
                projectChain,
                (await ecosystemsDataSource.getEcosystemById(senderAccountId, [
                  projectChain,
                ])) || shouldNeverHappen(),
              ),
            };
          }

          return shouldNeverHappen(
            'Supporter is neither a Project, a DripList, nor an Ecosystem.',
          );
        }),
      );

      const oneTimeDonationSupport =
        await supportDataSource.getOneTimeDonationSupportByAccountIdOnChain(
          projectId,
          projectChain,
        );

      return [...support, ...oneTimeDonationSupport];
    },
    totalEarned: async (
      projectData: ResolverClaimedProjectData,
      _: {},
      context: Context,
    ) => resolveTotalEarned(projectData, context),
    withdrawableBalances: async ({
      parentProjectInfo: { projectId, projectChain },
    }: ResolverClaimedProjectData) =>
      getWithdrawableBalancesOnChain(projectId, projectChain),
    withdrawableSubAccountBalances: async ({
      parentProjectInfo: { projectId, projectChain },
    }: ResolverClaimedProjectData) => {
      const subAccountId = await calcSubRepoDriverId(projectId, projectChain);
      return getWithdrawableBalancesOnChain(subAccountId, projectChain);
    },
    latestMetadataIpfsHash: async ({
      parentProjectInfo: { projectId, projectChain },
    }: ResolverClaimedProjectData) =>
      getLatestMetadataHashOnChain(projectId, projectChain),
    lastProcessedIpfsHash: (projectData: ResolverClaimedProjectData) =>
      projectData.lastProcessedIpfsHash,
  },
  UnClaimedProjectData: {
    verificationStatus: (projectData: ResolverUnClaimedProjectData) =>
      projectData.verificationStatus,
    support: async (
      {
        parentProjectInfo: { projectId, projectChain },
      }: ResolverUnClaimedProjectData,
      _: {},
      {
        dataSources: {
          projectsDataSource,
          dripListsDataSource,
          supportDataSource,
          ecosystemsDataSource,
          linkedIdentitiesDataSource,
          subListsDataSource,
        },
      }: Context,
    ) => {
      const splitsReceivers =
        await supportDataSource.getSplitSupportByReceiverIdOnChain(
          projectId,
          projectChain,
        );

      const support = await Promise.all(
        splitsReceivers.map(async (s) => {
          const { senderAccountId, senderAccountType, blockTimestamp } = s;

          if (senderAccountType === 'project') {
            return {
              ...s,
              account: {
                driver: Driver.REPO,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              splitsToSubAccount: s.splitsToRepoDriverSubAccount,
              project: await toResolverProject(
                [projectChain],
                (await projectsDataSource.getProjectByIdOnChain(
                  senderAccountId as RepoDriverId,
                  projectChain,
                )) || shouldNeverHappen(),
              ),
            };
          }
          if (senderAccountType === 'drip_list') {
            return {
              ...s,
              account: {
                driver: Driver.NFT,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              dripList: await toResolverDripList(
                projectChain,
                (await dripListsDataSource.getDripListById(
                  senderAccountId as NftDriverId,
                  [projectChain],
                )) || shouldNeverHappen(),
              ),
            };
          }
          if (senderAccountType === 'ecosystem_main_account') {
            assertIsNftDriverId(senderAccountId);

            return {
              ...s,
              account: {
                driver: Driver.NFT,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              ecosystemMainAccount: await toResolverEcosystem(
                projectChain,
                (await ecosystemsDataSource.getEcosystemById(senderAccountId, [
                  projectChain,
                ])) || shouldNeverHappen(),
              ),
            };
          }

          if (senderAccountType === 'linked_identity') {
            assertIsRepoDriverId(senderAccountId);

            const linkedIdentity =
              await linkedIdentitiesDataSource.getLinkedIdentityById(
                [projectChain],
                senderAccountId,
              );

            if (!linkedIdentity) {
              return shouldNeverHappen(
                `Expected LinkedIdentity ${senderAccountId} to exist.`,
              );
            }

            return {
              ...s,
              account: {
                driver: Driver.REPO,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              linkedIdentity: {
                account: {
                  driver: Driver.REPO,
                  accountId: linkedIdentity.accountId,
                },
                identityType: linkedIdentity.identityType,
                owner: {
                  driver: Driver.ADDRESS,
                  accountId: linkedIdentity.ownerAccountId,
                  address: getUserAddress(linkedIdentity.ownerAccountId),
                },
                isLinked: linkedIdentity.isLinked,
                createdAt: linkedIdentity.createdAt,
                updatedAt: linkedIdentity.updatedAt,
              },
            };
          }

          if (senderAccountType === 'sub_list') {
            assertIsImmutableSplitsDriverId(senderAccountId);

            const subList = (
              await subListsDataSource.getSubListsByIdsOnChain(
                [senderAccountId],
                projectChain,
              )
            )[0];

            if (!subList) {
              return shouldNeverHappen(
                `Expected SubList ${senderAccountId} to exist.`,
              );
            }

            return {
              ...s,
              account: {
                driver: Driver.IMMUTABLE_SPLITS,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              subList: await toResolverSubList(projectChain, subList),
            };
          }

          return shouldNeverHappen(
            'Supporter is not a supported account type.',
          );
        }),
      );

      // `GivenEventModelDataValues`s that represent one time donations to the Project.
      const oneTimeDonationSupport =
        await supportDataSource.getOneTimeDonationSupportByAccountIdOnChain(
          projectId,
          projectChain,
        );

      return [...support, ...oneTimeDonationSupport];
    },
    withdrawableBalances: async ({
      parentProjectInfo: { projectId, projectChain },
    }: ResolverUnClaimedProjectData) =>
      getWithdrawableBalancesOnChain(projectId, projectChain),
    withdrawableSubAccountBalances: async ({
      parentProjectInfo: { projectId, projectChain },
    }: ResolverUnClaimedProjectData) => {
      const subAccountId = await calcSubRepoDriverId(projectId, projectChain);
      return getWithdrawableBalancesOnChain(subAccountId, projectChain);
    },
    owner: (
      projectData: ResolverClaimedProjectData,
    ): AddressDriverAccount | null => projectData.owner,
  },
  Avatar: {
    __resolveType(parent: { cid: string } | { emoji: string }) {
      if ('cid' in parent) {
        return 'ImageAvatar';
      }

      return 'EmojiAvatar';
    },
  },
};

export default projectResolvers;
