import type {
  ImmutableSplitsDriverId,
  NftDriverId,
  RepoDriverId,
  ResolverEcosystem,
  ResolverEcosystemData,
} from '../common/types';
import type {
  AddressDriverAccount,
  Avatar,
  NftDriverAccount,
} from '../generated/graphql';
import { Driver, SupportedChain } from '../generated/graphql';
import type { Context } from '../server';
import assert, {
  assertIsImmutableSplitsDriverId,
  assertIsNftDriverId,
  assertIsRepoDriverId,
  assertMany,
  isNftDriverId,
} from '../utils/assert';
import { resolveTotalEarned } from '../common/commonResolverLogic';
import { chainToDbSchema } from '../utils/chainSchemaMappings';
import { getLatestMetadataHashOnChain } from '../utils/getLatestAccountMetadata';
import { toResolverEcosystem } from './ecosystemUtils';
import { toResolverDripList } from '../drip-list/dripListUtils';
import { toResolverProject } from '../project/projectUtils';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { SubListDataValues } from '../sub-list/SubListModel';
import type { ProjectDataValues } from '../project/ProjectModel';
import type { LinkedIdentityDataValues } from '../linked-identity/LinkedIdentityModel';
import getUserAddress from '../utils/getUserAddress';
import groupBy from '../utils/linq';
import { toResolverSubList } from '../sub-list/subListUtils';

const ecosystemResolvers = {
  Query: {
    ecosystemMainAccount: async (
      _: undefined,
      { id, chain }: { id: NftDriverId; chain: SupportedChain },
      { dataSources: { ecosystemsDataSource } }: Context,
    ): Promise<ResolverEcosystem | null> => {
      if (!isNftDriverId(id)) {
        return null;
      }

      assert(chain in SupportedChain);

      const dbSchemaToQuery = chainToDbSchema[chain];

      const dbEcosystem = await ecosystemsDataSource.getEcosystemById(id, [
        dbSchemaToQuery,
      ]);

      return dbEcosystem
        ? toResolverEcosystem(dbSchemaToQuery, dbEcosystem)
        : null;
    },
  },
  EcosystemMainAccount: {
    account: (ecosystem: ResolverEcosystemData): NftDriverAccount =>
      ecosystem.account,
    name: (ecosystem: ResolverEcosystemData) =>
      ecosystem.name ?? 'Unnamed Ecosystem',
    isVisible: ({ isVisible }: ResolverEcosystemData) => isVisible,
    creator: (ecosystem: ResolverEcosystemData) => ecosystem.creator,
    description: (ecosystem: ResolverEcosystemData) => ecosystem.description,
    previousOwnerAddress: (ecosystem: ResolverEcosystemData) =>
      ecosystem.previousOwnerAddress,
    owner: (ecosystem: ResolverEcosystemData): AddressDriverAccount =>
      ecosystem.owner,
    color: (ecosystem: ResolverEcosystemData): string => ecosystem.color,
    avatar: (ecosystem: ResolverEcosystemData): Avatar => ecosystem.avatar,
    splits: async (
      {
        parentEcosystemInfo: { ecosystemId, ecosystemChain },
      }: ResolverEcosystemData,
      _: {},
      {
        dataSources: {
          projectsDataSource,
          subListsDataSource,
          splitsReceiversDataSource,
          linkedIdentitiesDataSource,
        },
      }: Context,
    ) => {
      const splitsReceivers =
        await splitsReceiversDataSource.getSplitsReceiversForSenderOnChain(
          ecosystemId,
          ecosystemChain,
        );

      assertMany(
        splitsReceivers.map((s) => s.relationshipType),
        (s) => s === 'ecosystem_receiver',
      );

      assertMany(
        splitsReceivers.map((s) => s.receiverAccountType),
        (s) => s === 'project' || s === 'sub_list' || s === 'linked_identity',
      );

      const splitReceiversByReceiverAccountType = groupBy(
        splitsReceivers,
        (s) => s.receiverAccountType,
      );

      const addressDependencies = (
        splitReceiversByReceiverAccountType.get('address') || []
      ).map((s) => ({
        ...s,
        driver: Driver.ADDRESS,
        account: {
          driver: Driver.ADDRESS,
          accountId: s.receiverAccountId,
          address: getUserAddress(s.receiverAccountId),
        },
      }));

      const projectReceivers =
        splitReceiversByReceiverAccountType.get('project') || [];

      const subListReceivers =
        splitReceiversByReceiverAccountType.get('sub_list') || [];

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

      const [projects, subLists, linkedIdentities] = await Promise.all([
        projectReceivers.length > 0
          ? projectsDataSource.getProjectsByIdsOnChain(
              projectIds,
              ecosystemChain,
            )
          : [],

        subListReceivers.length > 0
          ? subListsDataSource.getSubListsByIdsOnChain(
              subListReceivers.map(
                (r) => r.receiverAccountId,
              ) as ImmutableSplitsDriverId[],
              ecosystemChain,
            )
          : [],

        linkedIdentityReceivers.length > 0
          ? linkedIdentitiesDataSource.getLinkedIdentitiesByIdsOnChain(
              linkedIdentityIds,
              ecosystemChain,
            )
          : [],
      ]);
      const projectsMap = new Map(
        projects
          .filter((p): p is ProjectDataValues => p.accountId !== undefined)
          .map((p) => [p.accountId, p]),
      );
      const subListsMap = new Map(
        subLists
          .filter((l): l is SubListDataValues => l.accountId !== undefined)
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
                  [ecosystemChain],
                  project as unknown as ProjectDataValues,
                )
              : undefined,
          };
        }),
      );
      const subListDependencies = await Promise.all(
        subListReceivers.map(async (s) => {
          assertIsImmutableSplitsDriverId(s.receiverAccountId);

          const subList = subListsMap.get(s.receiverAccountId);

          return {
            ...s,
            driver: Driver.IMMUTABLE_SPLITS,
            account: {
              driver: Driver.IMMUTABLE_SPLITS,
              accountId: s.receiverAccountId,
            },
            subList: subList
              ? await toResolverSubList(
                  ecosystemChain,
                  subList as unknown as SubListDataValues,
                )
              : shouldNeverHappen(),
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

      return [
        ...addressDependencies,
        ...projectDependencies,
        ...subListDependencies,
        ...orcidDependencies,
      ];
    },
    support: async (
      {
        parentEcosystemInfo: { ecosystemId, ecosystemChain },
      }: ResolverEcosystemData,
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
      const splitReceivers =
        await supportDataSource.getSplitSupportByReceiverIdOnChain(
          ecosystemId,
          ecosystemChain,
        );

      const supportItems = await Promise.all(
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
                [ecosystemChain],
                (await projectsDataSource.getProjectByIdOnChain(
                  senderAccountId,
                  ecosystemChain,
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
              project: await toResolverProject([ecosystemChain], projectData),
            };
          }
          if (senderAccountType === 'drip_list') {
            assertIsNftDriverId(senderAccountId);

            const dripListData = await dripListsDataSource.getDripListById(
              senderAccountId,
              [ecosystemChain],
            );

            if (!dripListData) {
              return null;
            }

            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: receiverAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              dripList: await toResolverDripList(ecosystemChain, dripListData),
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
                ecosystemChain,
                (await ecosystemsDataSource.getEcosystemById(senderAccountId, [
                  ecosystemChain,
                ])) || shouldNeverHappen(),
              ),
            };
          }

          if (senderAccountType === 'linked_identity') {
            assertIsRepoDriverId(senderAccountId);

            const linkedIdentity =
              await linkedIdentitiesDataSource.getLinkedIdentityById(
                [ecosystemChain],
                senderAccountId,
              );

            if (!linkedIdentity) {
              return shouldNeverHappen(
                `Expected LinkedIdentity ${senderAccountId} to exist.`,
              );
            }

            return {
              ...receiver,
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
                ecosystemChain,
              )
            )[0];

            if (!subList) {
              return shouldNeverHappen(
                `Expected SubList ${senderAccountId} to exist.`,
              );
            }

            return {
              ...receiver,
              account: {
                driver: Driver.IMMUTABLE_SPLITS,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              subList: await toResolverSubList(ecosystemChain, subList),
            };
          }

          return shouldNeverHappen(
            'Supporter is not a supported account type.',
          );
        }),
      );

      const projectsAndDripListsSupport = supportItems.filter(
        (item) => item !== null,
      );

      const oneTimeDonationSupport =
        await supportDataSource.getOneTimeDonationSupportByAccountIdOnChain(
          ecosystemId,
          ecosystemChain,
        );

      const streamSupport =
        await supportDataSource.getStreamSupportByAccountIdOnChain(
          ecosystemId,
          ecosystemChain,
        );

      return [
        ...projectsAndDripListsSupport,
        ...oneTimeDonationSupport,
        ...streamSupport,
      ];
    },
    totalEarned: async (
      ecosystemData: ResolverEcosystemData,
      _: {},
      context: Context,
    ) => resolveTotalEarned(ecosystemData, context),
    latestMetadataIpfsHash: async ({
      parentEcosystemInfo: { ecosystemChain, ecosystemId },
    }: ResolverEcosystemData) =>
      getLatestMetadataHashOnChain(ecosystemId, ecosystemChain),
    lastProcessedIpfsHash: (ecosystemData: ResolverEcosystemData) =>
      ecosystemData.lastProcessedIpfsHash,
  },
};

export default ecosystemResolvers;
