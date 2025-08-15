import { isAddress } from 'ethers';
import type {
  Address,
  NftDriverId,
  RepoDriverId,
  ResolverDripList,
  ResolverDripListData,
} from '../common/types';
import type {
  AddressDriverAccount,
  DripListWhereInput,
  DripListSortInput,
  NftDriverAccount,
} from '../generated/graphql';
import { SupportedChain, Driver } from '../generated/graphql';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { Context } from '../server';
import assert, {
  assertIsImmutableSplitsDriverId,
  assertIsNftDriverId,
  assertIsRepoDriverId,
  assertMany,
  isNftDriverId,
} from '../utils/assert';
import type { ProjectDataValues } from '../project/ProjectModel';
import queryableChains from '../common/queryableChains';
import { toResolverDripList, toResolverDripLists } from './dripListUtils';
import verifyDripListsInput from './dripListValidators';
import type { DripListDataValues } from './DripListModel';
import { resolveTotalEarned } from '../common/commonResolverLogic';
import { toResolverProject } from '../project/projectUtils';
import { toResolverSubList } from '../sub-list/subListUtils';
import { toResolverEcosystem } from '../ecosystem/ecosystemUtils';
import { chainToDbSchema } from '../utils/chainSchemaMappings';
import { getLatestMetadataHashOnChain } from '../utils/getLatestAccountMetadata';
import groupBy from '../utils/linq';
import getUserAddress from '../utils/getUserAddress';
import type { LinkedIdentityDataValues } from '../linked-identity/LinkedIdentityModel';

const dripListResolvers = {
  Query: {
    dripLists: async (
      _: undefined,
      {
        chains,
        where,
        sort,
        limit,
      }: {
        chains?: SupportedChain[];
        where?: DripListWhereInput;
        sort?: DripListSortInput;
        limit?: number;
      },
      { dataSources: { dripListsDataSource } }: Context,
    ): Promise<ResolverDripList[]> => {
      verifyDripListsInput({ chains, where, sort });

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      const dbDripLists = await dripListsDataSource.getDripListsByFilter(
        dbSchemasToQuery,
        where,
        sort,
        limit,
      );

      return toResolverDripLists(dbSchemasToQuery, dbDripLists);
    },
    dripList: async (
      _: undefined,
      { id, chain }: { id: NftDriverId; chain: SupportedChain },
      { dataSources: { dripListsDataSource } }: Context,
    ): Promise<ResolverDripList | null> => {
      if (!isNftDriverId(id)) {
        return null;
      }

      assert(chain in SupportedChain);

      const dbSchemaToQuery = chainToDbSchema[chain];

      const dbDripList = await dripListsDataSource.getDripListById(id, [
        dbSchemaToQuery,
      ]);

      return dbDripList
        ? toResolverDripList(dbSchemaToQuery, dbDripList)
        : null;
    },
    mintedTokensCountByOwnerAddress: async (
      _: undefined,
      { ownerAddress, chain }: { ownerAddress: Address; chain: SupportedChain },
      { dataSources: { dripListsDataSource } }: Context,
    ): Promise<{ chain: SupportedChain; total: number }> => {
      assert(isAddress(ownerAddress));
      assert(chain in SupportedChain);

      const dbSchemaToQuery = chainToDbSchema[chain];

      return dripListsDataSource.getMintedTokensCountByAccountId(
        dbSchemaToQuery,
        ownerAddress,
      );
    },
  },
  DripList: {
    account: (dripList: ResolverDripList): NftDriverAccount => dripList.account,
    name: (dripListData: ResolverDripListData) =>
      dripListData.name ?? 'Unnamed Drip List',
    isVisible: ({ isVisible }: ResolverDripListData) => isVisible,
    creator: (dripListData: ResolverDripListData) => dripListData.creator,
    description: (dripListData: ResolverDripListData) =>
      dripListData.description,
    previousOwnerAddress: (dripListData: ResolverDripListData) =>
      dripListData.previousOwnerAddress,
    owner: (dripListData: ResolverDripListData): AddressDriverAccount =>
      dripListData.owner,
    splits: async (
      {
        parentDripListInfo: { dripListId, dripListChain },
      }: ResolverDripListData,
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
          dripListId,
          dripListChain,
        );

      assertMany(
        splitsReceivers.map((s) => s.relationshipType),
        (s) => s === 'drip_list_receiver',
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
          ? projectsDataSource.getProjectsByIdsOnChain(
              projectIds,
              dripListChain,
            )
          : [],

        dripListReceivers.length > 0
          ? dripListsDataSource.getDripListsByIdsOnChain(
              dripListReceivers.map(
                (r) => r.receiverAccountId,
              ) as NftDriverId[],
              dripListChain,
            )
          : [],

        linkedIdentityReceivers.length > 0
          ? linkedIdentitiesDataSource.getLinkedIdentitiesByIdsOnChain(
              linkedIdentityIds,
              dripListChain,
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
                  [dripListChain],
                  project as unknown as ProjectDataValues,
                )
              : undefined,
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
                  dripListChain,
                  dripList as unknown as DripListDataValues,
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
        ...dripListDependencies,
        ...orcidDependencies,
      ];
    },
    support: async (
      {
        parentDripListInfo: { dripListId, dripListChain },
      }: ResolverDripListData,
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
          dripListId,
          dripListChain,
        );

      const projectsAndDripListsSupport = await Promise.all(
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
                [dripListChain],
                (await projectsDataSource.getProjectByIdOnChain(
                  senderAccountId,
                  dripListChain,
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
                dripListChain,
                (await dripListsDataSource.getDripListById(senderAccountId, [
                  dripListChain,
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
                dripListChain,
                (await ecosystemsDataSource.getEcosystemById(senderAccountId, [
                  dripListChain,
                ])) || shouldNeverHappen(),
              ),
            };
          }

          if (senderAccountType === 'linked_identity') {
            assertIsRepoDriverId(senderAccountId);

            const linkedIdentity =
              await linkedIdentitiesDataSource.getLinkedIdentityById(
                [dripListChain],
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
                identityType: linkedIdentity.identityType.toUpperCase(),
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
                dripListChain,
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
              subList: await toResolverSubList(dripListChain, subList),
            };
          }

          return shouldNeverHappen(
            'Supporter is not a supported account type.',
          );
        }),
      );

      const oneTimeDonationSupport =
        await supportDataSource.getOneTimeDonationSupportByAccountIdOnChain(
          dripListId,
          dripListChain,
        );

      const streamSupport =
        await supportDataSource.getStreamSupportByAccountIdOnChain(
          dripListId,
          dripListChain,
        );

      return [
        ...projectsAndDripListsSupport,
        ...oneTimeDonationSupport,
        ...streamSupport,
      ];
    },
    totalEarned: async (
      dripListData: ResolverDripListData,
      _: {},
      context: Context,
    ) => resolveTotalEarned(dripListData, context),
    latestMetadataIpfsHash: async ({
      parentDripListInfo: { dripListChain, dripListId },
    }: ResolverDripListData) =>
      getLatestMetadataHashOnChain(dripListId, dripListChain),
    lastProcessedIpfsHash: (dripListData: ResolverDripListData) =>
      dripListData.lastProcessedIpfsHash,
  },
};

export default dripListResolvers;
