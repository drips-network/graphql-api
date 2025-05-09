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
  NftDriverAccount,
} from '../generated/graphql';
import { SupportedChain, Driver } from '../generated/graphql';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { Context } from '../server';
import assert, {
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
import { chainToDbSchema } from '../utils/chainSchemaMappings';
import { getLatestMetadataHashOnChain } from '../utils/getLatestAccountMetadata';
import groupBy from '../utils/linq';
import getUserAddress from '../utils/getUserAddress';

const dripListResolvers = {
  Query: {
    dripLists: async (
      _: undefined,
      {
        chains,
        where,
      }: { chains?: SupportedChain[]; where?: DripListWhereInput },
      { dataSources: { dripListsDataSource } }: Context,
    ): Promise<ResolverDripList[]> => {
      verifyDripListsInput({ chains, where });

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      const dbDripLists = await dripListsDataSource.getDripListsByFilter(
        dbSchemasToQuery,
        where,
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
        (s) => s === 'address' || s === 'project' || s === 'drip_list',
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

      const [projects, dripLists] = await Promise.all([
        projectReceivers.length > 0
          ? projectsDataSource.getProjectsByIdsOnChain(
              projectReceivers.map(
                (r) => r.receiverAccountId,
              ) as RepoDriverId[],
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

      return [
        ...addressDependencies,
        ...projectDependencies,
        ...dripListDependencies,
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
          const {
            senderAccountId,
            receiverAccountId,
            blockTimestamp,
            senderAccountType,
          } = receiver;

          if (senderAccountType === 'project') {
            assertIsRepoDriverId(senderAccountId);

            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: receiverAccountId,
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
                accountId: receiverAccountId,
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

          return shouldNeverHappen(
            'Supported is neither a Project nor a DripList.',
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
