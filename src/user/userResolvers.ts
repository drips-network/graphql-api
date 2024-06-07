import { isAddress } from 'ethers';
import { assetOutgoingBalanceTimeline } from '../balances/estimate-reloaded';
import type {
  AccountId,
  Address,
  AddressDriverId,
  ResolverUser,
  ResolverUserChainData,
  ResolverUserData,
  UserDataParentDripListInfo,
} from '../common/types';
import DripListModel from '../drip-list/DripListModel';
import type {
  SupportedChain,
  AddressDriverAccount,
  User,
} from '../generated/graphql';
import type { Context } from '../server';
import assert, { isAddressDriverId } from '../utils/assert';
import getAssetConfigs from '../utils/getAssetConfigs';
import getUserAddress from '../utils/getUserAddress';
import queryableChains from '../common/queryableChains';
import { toResolverProjects } from '../project/projectUtils';
import { toResolverDripLists } from '../drip-list/dripListUtils';
import getLatestAccountMetadataByChain from '../utils/getLatestAccountMetadata';
import { validateChainsQueryArg } from '../utils/commonInputValidators';
import toResolverUser from './userUtils';
import { getCrossChainAddressDriverAccountIdByAddress } from '../common/dripsContracts';

const userResolvers = {
  Query: {
    userById: (
      _: undefined,
      {
        accountId,
        chains,
      }: { accountId: AddressDriverId; chains?: SupportedChain[] },
    ): ResolverUser => {
      assert(isAddressDriverId(accountId));
      if (chains?.length) {
        validateChainsQueryArg(chains);
      }

      const chainsToQuery = chains?.length ? chains : queryableChains;

      return toResolverUser(chainsToQuery, accountId);
    },
    userByAddress: async (
      _: undefined,
      { address, chains }: { address: Address; chains?: SupportedChain[] },
    ): Promise<ResolverUser> => {
      assert(isAddress(address));
      if (chains?.length) {
        validateChainsQueryArg(chains);
      }

      const chainsToQuery = chains?.length ? chains : queryableChains;

      const accountId =
        await getCrossChainAddressDriverAccountIdByAddress(address);

      return toResolverUser(chainsToQuery, accountId);
    },
  },
  User: {
    account: (user: ResolverUser): AddressDriverAccount => user.account,
    chainData: (user: ResolverUser): ResolverUserChainData[] => user.chainData,
  },
  UserChainData: {
    chain: (chainUserData: ResolverUserChainData): SupportedChain =>
      chainUserData.chain,
    data: (chainUserData: ResolverUserChainData) => chainUserData.data,
  },
  UserData: {
    streams: async ({
      parentUserInfo,
      streams: { incoming, outgoing },
    }: ResolverUserData) => ({
      incoming,
      outgoing,
      parentUserInfo,
    }),
    balances: async ({
      parentUserInfo: { accountId, userChain },
    }: ResolverUserData) => {
      const chainMetadata = await getLatestAccountMetadataByChain(
        [userChain],
        accountId as AddressDriverId,
      );

      const metadata = chainMetadata[userChain]?.metadata ?? {};

      const assetConfigs = await getAssetConfigs(
        accountId as AddressDriverId,
        metadata,
      );

      return Object.entries(assetConfigs).map(([chain, chainAssetConfigs]) => ({
        chain: chain as SupportedChain,

        assetConfigs: chainAssetConfigs.map((ac) => ({
          tokenAddress: ac.tokenAddress,
          incoming: [],
          outgoing: assetOutgoingBalanceTimeline(ac.history),
        })),
      }));
    },
    projects: async (
      { parentUserInfo: { accountId, userChain } }: ResolverUserData,
      _: {},
      { dataSources: { projectsDataSource } }: Context,
    ) => {
      const projectDataValues = await projectsDataSource.getProjectsByFilter(
        [userChain],
        {
          ownerAddress: getUserAddress(accountId),
        },
      );

      return toResolverProjects([userChain], projectDataValues);
    },
    dripLists: async (
      { parentUserInfo: { accountId, userChain } }: ResolverUserData,
      _: {},
      { dataSources: { dripListsDataSource } }: Context,
    ) => {
      const dripListDataValues = await dripListsDataSource.getDripListsByFilter(
        [userChain],
        {
          ownerAddress: getUserAddress(accountId),
        },
      );

      return toResolverDripLists([userChain], dripListDataValues);
    },
    support: async (
      { parentUserInfo: { accountId, userChain } }: ResolverUserData,
      _: {},
      { dataSources: { projectAndDripListSupportDataSource } }: Context,
    ) => {
      const projectAndDripListSupport =
        await projectAndDripListSupportDataSource.getProjectAndDripListSupportByAddressDriverId(
          [userChain],
          accountId as AddressDriverId,
        );

      const oneTimeDonationSupport =
        await projectAndDripListSupportDataSource.getOneTimeDonationSupportByAccountId(
          [userChain],
          accountId as AccountId,
        );

      const streamSupport =
        await projectAndDripListSupportDataSource.getStreamSupportByAccountId(
          [userChain],
          accountId as AccountId,
        );

      return [
        ...projectAndDripListSupport,
        ...streamSupport,
        ...oneTimeDonationSupport,
      ];
    },
    latestMetadataIpfsHash: async ({
      parentUserInfo: { accountId, userChain },
    }: ResolverUserData) => {
      const chainMetadata = await getLatestAccountMetadataByChain(
        [userChain],
        accountId as AddressDriverId,
      );

      return chainMetadata[userChain]?.ipfsHash;
    },
  },
  UserStreams: {
    outgoing: async (
      { parentUserInfo }: UserDataParentDripListInfo,
      _: {},
      { dataSources: { streamsDataSource } }: Context,
    ) => {
      const { accountId, userChain } = parentUserInfo;
      assert(isAddressDriverId(accountId));

      return (
        await streamsDataSource.getUserOutgoingStreams([userChain], accountId)
      )[userChain as SupportedChain];
    },
    incoming: async (
      { parentUserInfo }: UserDataParentDripListInfo,
      _: {},
      { dataSources: { streamsDataSource } }: Context,
    ) => {
      const { accountId, userChain } = parentUserInfo;
      assert(isAddressDriverId(accountId));

      return (
        await streamsDataSource.getUserIncomingStreams([userChain], accountId)
      )[userChain as SupportedChain];
    },
  },
  StreamReceiver: {
    __resolveType(parent: DripListModel | User) {
      if (parent instanceof DripListModel) {
        return 'DripList';
      }

      return 'User';
    },
  },
};

export default userResolvers;
