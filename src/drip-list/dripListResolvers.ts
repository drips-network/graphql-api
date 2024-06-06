import { isAddress } from 'ethers';
import type {
  Address,
  DripListId,
  ResolverDripList,
  ResolverDripListChainData,
  ResolverDripListData,
} from '../common/types';
import type DripListModel from './DripListModel';
import type {
  AddressDriverAccount,
  AddressReceiver,
  DripList,
  DripListWhereInput,
  NftDriverAccount,
  Project,
  SplitsReceiver,
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

      const chainsToQuery = chains?.length ? chains : queryableChains;

      const dbDripLists = await dripListsDataSource.getDripListsByFilter(
        chainsToQuery,
        where,
      );

      return toResolverDripLists(chainsToQuery, dbDripLists);
    },
    dripList: async (
      _: undefined,
      { id, chain }: { id: DripListId; chain: SupportedChain },
      { dataSources: { dripListsDataSource } }: Context,
    ): Promise<ResolverDripList | null> => {
      assert(isDripListId(id));
      assert(chain in SupportedChain);

      const dbDripList = await dripListsDataSource.getDripListById([chain], id);

      return dbDripList ? toResolverDripList(chain, dbDripList) : null;
    },
    mintedTokensCountByOwnerAddress: async (
      _: undefined,
      { ownerAddress, chain }: { ownerAddress: Address; chain: SupportedChain },
      { dataSources: { dripListsDataSource } }: Context,
    ): Promise<{ chain: SupportedChain; total: number }> => {
      assert(isAddress(ownerAddress));
      assert(chain in SupportedChain);

      return dripListsDataSource.getMintedTokensCountByAccountId(
        chain,
        ownerAddress,
      );
    },
  },
  DripList: {
    account: (dripList: ResolverDripList): NftDriverAccount => dripList.account,
  },
  DripListChainData: {
    chain: (chainDripListData: ResolverDripListChainData): SupportedChain =>
      chainDripListData.chain,
    data: (chainDripListData: ResolverDripListChainData) =>
      chainDripListData.data,
  },
  DripListData: {
    name: (dripListData: ResolverDripListData) =>
      dripListData.name ?? 'Unnamed Drip List',
    creator: (dripListData: ResolverDripListData) => dripListData.creator,
    description: (dripListData: ResolverDripListData) =>
      dripListData.description,
    previousOwnerAddress: (dripListData: ResolverDripListData) =>
      dripListData.previousOwnerAddress,
    latestVotingRoundId: (dripList: DripListModel) =>
      dripList.latestVotingRoundId,
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
    ): Promise<SplitsReceiver[]> => {
      const receiversOfTypeAddressModels =
        await receiversOfTypeAddressDataSource.getReceiversOfTypeAddressByDripListId(
          dripListId,
          [dripListChain],
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
        await receiversOfTypeProjectDataSource.getReceiversOfTypeProjectByDripListId(
          dripListId,
          [dripListChain],
        );

      const splitsOfTypeProjectModels =
        await projectsDataSource.getProjectsByIds(
          receiversOfTypeProjectModels.map((r) => r.fundeeProjectId),
          [dripListChain],
        );

      const projectReceivers = receiversOfTypeProjectModels.map((receiver) => ({
        driver: Driver.REPO,
        weight: receiver.weight,
        receiverType: receiver.type,
        account: {
          driver: Driver.REPO,
          accountId: receiver.fundeeProjectId,
        },
        project:
          (splitsOfTypeProjectModels
            .filter(
              (p): p is ProjectDataValues => p && (p as any).id !== undefined,
            )
            .find(
              (p) => (p as any).id === receiver.fundeeProjectId,
            ) as unknown as Project) || shouldNeverHappen(),
      }));

      const receiversOfTypeDripListModels =
        await receiversOfTypeDripListDataSource.getReceiversOfTypeDripListByDripListId(
          dripListId,
          [dripListChain],
        );

      const splitsOfTypeDripListModels =
        await dripListsDataSource.getDripListsByIds(
          receiversOfTypeDripListModels.map((r) => r.fundeeDripListId),
          [dripListChain],
        );

      const dripListReceivers = receiversOfTypeDripListModels.map(
        (receiver) => ({
          driver: Driver.NFT,
          weight: receiver.weight,
          account: {
            driver: Driver.NFT,
            accountId: receiver.fundeeDripListId,
          },
          dripList:
            (splitsOfTypeDripListModels
              .filter(
                (l): l is DripListDataValues =>
                  l && (l as any).id !== undefined,
              )
              .find(
                (p) => (p as any).id === receiver.fundeeDripListId,
              ) as unknown as DripList) || shouldNeverHappen(),
        }),
      );

      return [...addressSplits, ...projectReceivers, ...dripListReceivers];
    },
    support: async (
      {
        parentDripListInfo: { dripListId, dripListChain },
      }: ResolverDripListData,
      _: {},
      { dataSources: { projectAndDripListSupportDataSource } }: Context,
    ) => {
      const projectAndDripListSupport =
        await projectAndDripListSupportDataSource.getProjectAndDripListSupportByDripListId(
          dripListId,
          [dripListChain],
        );

      const oneTimeDonationSupport =
        await projectAndDripListSupportDataSource.getOneTimeDonationSupportByAccountId(
          [dripListChain],
          dripListId,
        );

      const streamSupport =
        await projectAndDripListSupportDataSource.getStreamSupportByAccountId(
          [dripListChain],
          dripListId,
        );

      return [
        ...projectAndDripListSupport,
        ...streamSupport,
        ...oneTimeDonationSupport,
      ];
    },
    totalEarned: async (
      dripListData: ResolverDripListData,
      _: {},
      context: Context,
    ) => resolveTotalEarned(dripListData, context),
  },
};

export default dripListResolvers;
