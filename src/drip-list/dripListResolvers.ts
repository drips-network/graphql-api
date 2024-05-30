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
import toResolverDripLists from './dripListUtils';
import verifyDripListsInput from './dripListValidators';
import type { DripListDataValues } from './DripListModel';
import { resolveTotalEarned } from '../common/commonResolverLogic';

const dripListResolvers = {
  Query: {
    dripLists: async (
      _: any,
      {
        chains,
        where,
      }: { chains: SupportedChain[]; where: DripListWhereInput },
      { dataSources }: Context,
    ): Promise<ResolverDripList[]> => {
      verifyDripListsInput({ chains, where });

      const chainsToQuery = chains?.length ? chains : queryableChains;

      const dripListDataValues =
        await dataSources.dripListsDb.getDripListsByFilter(
          chainsToQuery,
          where,
        );

      return toResolverDripLists(chainsToQuery, dripListDataValues);
    },
    dripList: async (
      _: any,
      { id, chain }: { id: DripListId; chain: SupportedChain },
      { dataSources }: Context,
    ): Promise<ResolverDripList | null> => {
      assert(isDripListId(id));
      assert(chain in SupportedChain);

      const dripListDataValues = await dataSources.dripListsDb.getDripListById(
        id,
        chain,
      );

      if (!dripListDataValues) {
        return null;
      }

      return (await toResolverDripLists([chain], [dripListDataValues]))[0];
    },
    mintedTokensCountByOwnerAddress: async (
      _: any,
      { ownerAddress }: { ownerAddress: Address },
      { dataSources }: Context,
    ): Promise<number> => {
      assert(isAddress(ownerAddress));

      return dataSources.dripListsDb.getMintedTokensCountByAccountId(
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
      dripListData: ResolverDripListData,
      _: any,
      context: Context,
    ): Promise<SplitsReceiver[]> => {
      const {
        dataSources: {
          projectsDb,
          dripListsDb,
          receiversOfTypeAddressDb,
          receiversOfTypeProjectDb,
          receiversOfTypeDripListDb,
        },
      } = context;

      const {
        parentDripListInfo: { dripListId, dripListChain },
      } = dripListData;

      const receiversOfTypeAddressModels =
        await receiversOfTypeAddressDb.getReceiversOfTypeAddressByDripListId(
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
        await receiversOfTypeProjectDb.getReceiversOfTypeProjectByDripListId(
          dripListId,
          [dripListChain],
        );

      const splitsOfTypeProjectModels = await projectsDb.getProjectsByIds(
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
        await receiversOfTypeDripListDb.getReceiversOfTypeDripListByDripListId(
          dripListId,
          [dripListChain],
        );

      const splitsOfTypeDripListModels = await dripListsDb.getDripListsByIds(
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
      dripListData: ResolverDripListData,
      _: any,
      context: Context,
    ) => {
      const {
        parentDripListInfo: { dripListId, dripListChain },
      } = dripListData;

      const {
        dataSources: { projectAndDripListSupportDb },
      } = context;

      const projectAndDripListSupport =
        await projectAndDripListSupportDb.getProjectAndDripListSupportByDripListId(
          dripListId,
          [dripListChain],
        );

      const oneTimeDonationSupport =
        await projectAndDripListSupportDb.getOneTimeDonationSupportByAccountId(
          dripListId,
          [dripListChain],
        );

      const streamSupport =
        await projectAndDripListSupportDb.getStreamSupportByAccountId(
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
      _: any,
      context: Context,
    ) => resolveTotalEarned(dripListData, _, context),
  },
};

export default dripListResolvers;
