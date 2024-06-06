import { isAddress } from 'ethers';
import { assetOutgoingBalanceTimeline } from '../balances/estimate-reloaded';
import type {
  AccountId,
  Address,
  AddressDriverId,
  ResolverUser,
  ResolverUserChainData,
  ResolverUserData,
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

const userResolvers = {
  Query: {
    userById: async (
      _: undefined,
      {
        chains,
        accountId,
      }: { chains?: SupportedChain[]; accountId: AddressDriverId },
      { dataSources: { usersDataSource } }: Context,
    ): Promise<ResolverUser> => {
      if (chains?.length) {
        validateChainsQueryArg(chains);
      }

      const chainsToQuery = chains?.length ? chains : queryableChains;

      return usersDataSource.getUserByAccountId(chainsToQuery, accountId);
    },
    userByAddress: async (
      _: undefined,
      { chains, address }: { chains?: SupportedChain[]; address: Address },
      { dataSources }: Context,
    ): Promise<ResolverUser> => {
      assert(isAddress(address));
      if (chains?.length) {
        validateChainsQueryArg(chains);
      }

      const chainsToQuery = chains?.length ? chains : queryableChains;

      return dataSources.usersDataSource.getUserByAddress(
        chainsToQuery,
        address,
      );
    },
  },
  User: {
    account: (user: ResolverUser): AddressDriverAccount => user.account,
  },
  UserChainData: {
    chain: (chainUserData: ResolverUserChainData): SupportedChain =>
      chainUserData.chain,
    data: (chainUserData: ResolverUserChainData) => chainUserData.data,
  },
  UserData: {
    streams: async ({ parentUserInfo, streams }: ResolverUserData) => ({
      incoming: streams.incoming,
      outgoing: streams.outgoing,
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
      userData: {
        parentUserInfo: { accountId: AccountId; userChain: SupportedChain };
      },
      _: {},
      { dataSources }: Context,
    ) => {
      const { accountId, userChain } = userData.parentUserInfo;
      assert(isAddressDriverId(accountId));

      return (
        await dataSources.streamsDataSource.getUserOutgoingStreams(
          [userChain],
          accountId,
        )
      )[userChain as SupportedChain];
    },
    incoming: async (
      userData: {
        parentUserInfo: { accountId: AccountId; userChain: SupportedChain };
      },
      _: any,
      { dataSources }: Context,
    ) => {
      const { accountId, userChain } = userData.parentUserInfo;
      assert(isAddressDriverId(accountId));

      return (
        await dataSources.streamsDataSource.getUserIncomingStreams(
          [userChain],
          accountId,
        )
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
