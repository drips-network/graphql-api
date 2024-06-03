import { assetOutgoingBalanceTimeline } from '../balances/estimate-reloaded';
import type {
  Address,
  AddressDriverId,
  ResolverUser,
  ResolverUserChainData,
  ResolverUserData,
} from '../common/types';
import DripListModel from '../drip-list/DripListModel';
import { SupportedChain } from '../generated/graphql';
import type { AddressDriverAccount, User } from '../generated/graphql';
import type { Context } from '../server';
import assert, { isAddressDriverId } from '../utils/assert';
import getAssetConfigs from '../utils/getAssetConfigs';
import getUserAddress from '../utils/getUserAddress';
import queryableChains from '../common/queryableChains';
import { toResolverProjects } from '../project/projectUtils';
import toResolverDripLists from '../drip-list/dripListUtils';
import getLatestAccountMetadataByChain from '../utils/getLatestAccountMetadata';

const userResolvers = {
  Query: {
    userById: async (
      _: any,
      {
        chains,
        accountId,
      }: { chains: SupportedChain[]; accountId: AddressDriverId },
      { dataSources }: Context,
    ): Promise<ResolverUser> => {
      if (chains) {
        chains.forEach((chain) => {
          assert(chain in SupportedChain);
        });
      }

      const chainsToQuery = chains?.length ? chains : queryableChains;

      return dataSources.usersDb.getUserByAccountId(chainsToQuery, accountId);
    },
    userByAddress: async (
      _: any,
      { chains, address }: { chains: SupportedChain[]; address: Address },
      { dataSources }: Context,
    ): Promise<ResolverUser> => {
      if (chains) {
        chains.forEach((chain) => {
          assert(chain in SupportedChain);
        });
      }

      const chainsToQuery = chains?.length ? chains : queryableChains;

      return dataSources.usersDb.getUserByAddress(chainsToQuery, address);
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
    streams: async (userData: ResolverUserData) => {
      const { parentUserInfo, streams } = userData;

      return {
        incoming: streams.incoming,
        outgoing: streams.outgoing,
        parentUserInfo,
      };
    },
    balances: async (userData: ResolverUserData) => {
      const {
        parentUserInfo: { accountId, userChain },
      } = userData;
      assert(isAddressDriverId(accountId));

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
      userData: ResolverUserData,
      _: any,
      { dataSources }: Context,
    ) => {
      const { accountId, userChain } = userData.parentUserInfo;
      assert(isAddressDriverId(accountId));

      const projectDataValues =
        await dataSources.projectsDb.getProjectsByFilter([userChain], {
          ownerAddress: getUserAddress(accountId),
        });

      return toResolverProjects([userChain], projectDataValues);
    },
    dripLists: async (
      userData: ResolverUserData,
      _: any,
      { dataSources }: Context,
    ) => {
      const { accountId, userChain } = userData.parentUserInfo;
      assert(isAddressDriverId(accountId));

      const dripListDataValues =
        await dataSources.dripListsDb.getDripListsByFilter([userChain], {
          ownerAddress: getUserAddress(accountId),
        });

      return toResolverDripLists([userChain], dripListDataValues);
    },
  },
  UserStreams: {
    outgoing: async (
      userData: { parentUserInfo: { accountId: any; userChain: any } },
      _: any,
      { dataSources }: Context,
    ) => {
      const { accountId, userChain } = userData.parentUserInfo;
      assert(isAddressDriverId(accountId));

      return (
        await dataSources.streamsDb.getUserOutgoingStreams(
          [userChain],
          accountId,
        )
      )[userChain as SupportedChain];
    },
    incoming: async (
      userData: { parentUserInfo: { accountId: any; userChain: any } },
      _: any,
      { dataSources }: Context,
    ) => {
      const { accountId, userChain } = userData.parentUserInfo;
      assert(isAddressDriverId(accountId));

      return (
        await dataSources.streamsDb.getUserIncomingStreams(
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
