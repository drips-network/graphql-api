import { isAddress } from 'ethers';
import type {
  Address,
  DripListId,
  ResolverDripList,
  ResolverDripListData,
} from '../common/types';
import type {
  AddressDriverAccount,
  AddressReceiver,
  DripListWhereInput,
  NftDriverAccount,
} from '../generated/graphql';
import { SupportedChain, Driver } from '../generated/graphql';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { Context } from '../server';
import assert, { isDripListId } from '../utils/assert';
import type { ProjectDataValues } from '../project/ProjectModel';
import queryableChains from '../common/queryableChains';
import { toResolverDripList, toResolverDripLists } from './dripListUtils';
import verifyDripListsInput from './dripListValidators';
import type { DripListDataValues } from './DripListModel';
import { resolveTotalEarned } from '../common/commonResolverLogic';
import { toResolverProject } from '../project/projectUtils';
import { chainToDbSchema } from '../utils/chainSchemaMappings';
import { getLatestMetadataHashOnChain } from '../utils/getLatestAccountMetadata';

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
      { id, chain }: { id: DripListId; chain: SupportedChain },
      { dataSources: { dripListsDataSource } }: Context,
    ): Promise<ResolverDripList | null> => {
      assert(isDripListId(id));
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
          receiversOfTypeAddressDataSource,
          receiversOfTypeProjectDataSource,
          receiversOfTypeDripListDataSource,
        },
      }: Context,
    ) => {
      const receiversOfTypeAddressModels =
        await receiversOfTypeAddressDataSource.getReceiversOfTypeAddressByDripListIdOnChain(
          dripListId,
          dripListChain,
        );

      const addressSplits = receiversOfTypeAddressModels.map((receiver) => ({
        driver: Driver.ADDRESS,
        weight: receiver.weight,
        receiverType: receiver.type,
        account: {
          driver: Driver.ADDRESS,
          accountId: receiver.fundeeAccountId,
          address: receiver.fundeeAccountAddress,
        },
      })) as AddressReceiver[];

      const receiversOfTypeProjectModels =
        await receiversOfTypeProjectDataSource.getReceiversOfTypeProjectByDripListIdOnChain(
          dripListId,
          dripListChain,
        );

      const splitsOfTypeProjectModels =
        await projectsDataSource.getProjectsByIdsOnChain(
          receiversOfTypeProjectModels.map((r) => r.fundeeProjectId),
          dripListChain,
        );

      const projectReceivers = await Promise.all(
        receiversOfTypeProjectModels.map(async (receiver) => ({
          driver: Driver.REPO,
          weight: receiver.weight,
          receiverType: receiver.type,
          account: {
            driver: Driver.REPO,
            accountId: receiver.fundeeProjectId,
          },
          project: await toResolverProject(
            [dripListChain],
            (splitsOfTypeProjectModels
              .filter(
                (p): p is ProjectDataValues => p && (p as any).id !== undefined,
              )
              .find(
                (p) => (p as any).id === receiver.fundeeProjectId,
              ) as unknown as ProjectDataValues) || shouldNeverHappen(),
          ),
        })),
      );

      const receiversOfTypeDripListModels =
        await receiversOfTypeDripListDataSource.getReceiversOfTypeDripListByDripListIdOnChain(
          dripListId,
          dripListChain,
        );

      const splitsOfTypeDripListModels =
        await dripListsDataSource.getDripListsByIdsOnChain(
          receiversOfTypeDripListModels.map((r) => r.fundeeDripListId),
          dripListChain,
        );

      const dripListReceivers = await Promise.all(
        receiversOfTypeDripListModels.map(async (receiver) => ({
          driver: Driver.NFT,
          weight: receiver.weight,
          account: {
            driver: Driver.NFT,
            accountId: receiver.fundeeDripListId,
          },
          dripList: await toResolverDripList(
            dripListChain,
            (splitsOfTypeDripListModels
              .filter(
                (l): l is DripListDataValues =>
                  l && (l as any).id !== undefined,
              )
              .find(
                (p) => (p as any).id === receiver.fundeeDripListId,
              ) as unknown as DripListDataValues) || shouldNeverHappen(),
          ),
        })),
      );

      return [...addressSplits, ...projectReceivers, ...dripListReceivers];
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
          projectAndDripListSupportDataSource,
        },
      }: Context,
    ) => {
      // All `RepoDriverSplitReceiver`s that represent the Drip List as a receiver.
      const dbRepoDriverSplitReceivers =
        await projectAndDripListSupportDataSource.getProjectAndDripListSupportByDripListIdOnChain(
          dripListId,
          dripListChain,
        );

      const projectsAndDripListsSupport = await Promise.all(
        dbRepoDriverSplitReceivers.map(async (receiver) => {
          const {
            funderProjectId,
            funderDripListId,
            fundeeDripListId,
            blockTimestamp,
          } = receiver;

          // Supported is a Project.
          if (funderProjectId && !funderDripListId) {
            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: fundeeDripListId,
              },
              date: blockTimestamp,
              totalSplit: [],
              project: await toResolverProject(
                [dripListChain],
                (await projectsDataSource.getProjectByIdOnChain(
                  funderProjectId,
                  dripListChain,
                )) || shouldNeverHappen(),
              ),
            };
            // Supported is a DripList.
          }
          if (funderDripListId && !funderProjectId) {
            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: fundeeDripListId,
              },
              date: blockTimestamp,
              totalSplit: [],
              dripList: await toResolverDripList(
                dripListChain,
                (await dripListsDataSource.getDripListById(funderDripListId, [
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

      // `GivenEventModelDataValues`s that represent one time donations to the Project.
      const oneTimeDonationSupport =
        await projectAndDripListSupportDataSource.getOneTimeDonationSupportByAccountIdOnChain(
          dripListId,
          dripListChain,
        );

      const streamSupport =
        await projectAndDripListSupportDataSource.getStreamSupportByAccountIdOnChain(
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
