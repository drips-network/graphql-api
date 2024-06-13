import {
  assetIncomingBalanceTimeline,
  assetOutgoingBalanceTimeline,
} from '../balances/estimate-reloaded';
import type { AccountId, Address, AddressDriverId } from '../common/types';
import DripListModel from '../drip-list/DripListModel';
import { Driver } from '../generated/graphql';
import type { User } from '../generated/graphql';
import type { Context } from '../server';
import assert, { isAddressDriverId } from '../utils/assert';
import getAssetConfigs from '../utils/getAssetConfigs';
import getLatestAccountMetadata, {
  getLatestMetadataHash,
} from '../utils/getLatestAccountMetadata';
import getUserAddress from '../utils/getUserAddress';
import getWithdrawableBalances, {
  getRelevantTokens,
} from '../utils/getWithdrawableBalances';

const userResolvers = {
  Query: {
    userById: async (
      _: any,
      { accountId }: { accountId: AddressDriverId },
      { dataSources }: Context,
    ): Promise<User> => dataSources.usersDb.getUserByAccountId(accountId),
    userByAddress: async (
      _: any,
      { address }: { address: Address },
      { dataSources }: Context,
    ): Promise<User> => dataSources.usersDb.getUserByAddress(address),
  },
  User: {
    account: (parent: User) => ({
      accountId: parent.account.accountId,
      driver: Driver.ADDRESS,
      address: getUserAddress(parent.account.accountId as AddressDriverId),
    }),
    streams: async (parent: User) => ({
      accountId: parent.account.accountId,
    }),
    withdrawableBalances: async (parent: User) =>
      getWithdrawableBalances(parent.account.accountId as AccountId),
    balances: async (parent: User, _: any, { dataSources }: Context) => {
      const { metadata } =
        (await getLatestAccountMetadata(
          parent.account.accountId as AddressDriverId,
        )) ?? {};

      const [assetConfigs, incomingStreams, relevantTokensForIncomingBalance] =
        await Promise.all([
          getAssetConfigs(
            parent.account.accountId as AddressDriverId,
            metadata,
          ),
          dataSources.streamsDb.getUserIncomingStreams(
            parent.account.accountId as AddressDriverId,
          ),
          getRelevantTokens(parent.account.accountId as AccountId),
        ]);

      const allTokens = Array.from(
        new Set([
          ...assetConfigs.map((ac) => ac.tokenAddress),
          ...relevantTokensForIncomingBalance,
        ]),
      );

      return Promise.all(
        allTokens.map(async (tokenAddress) => {
          const outgoingAssetConfig = assetConfigs.find(
            (ac) => ac.tokenAddress === tokenAddress,
          );

          return {
            tokenAddress,
            incoming: await assetIncomingBalanceTimeline(
              parent.account.accountId as AccountId,
              tokenAddress,
              incomingStreams,
            ),
            outgoing: outgoingAssetConfig
              ? assetOutgoingBalanceTimeline(outgoingAssetConfig.history)
              : [],
          };
        }),
      );
    },
    projects: (parent: User, _: any, { dataSources }: Context) => {
      const { accountId } = parent.account;
      assert(isAddressDriverId(accountId));

      return dataSources.projectsDb.getProjectsByFilter({
        ownerAddress: getUserAddress(accountId),
      });
    },
    dripLists: (parent: User, _: any, { dataSources }: Context) => {
      const { accountId } = parent.account;
      assert(isAddressDriverId(accountId));

      return dataSources.dripListsDb.getDripListsByFilter({
        ownerAddress: getUserAddress(accountId),
      });
    },
    support: async (parent: User, _: any, context: Context) => {
      const {
        dataSources: { projectAndDripListSupportDb },
      } = context;

      const projectAndDripListSupport =
        await projectAndDripListSupportDb.getProjectAndDripListSupportByAddressDriverId(
          parent.account.accountId as AddressDriverId,
        );

      const oneTimeDonationSupport =
        await projectAndDripListSupportDb.getOneTimeDonationSupportByAccountId(
          parent.account.accountId as AccountId,
        );

      const streamSupport =
        await projectAndDripListSupportDb.getStreamSupportByAccountId(
          parent.account.accountId as AccountId,
        );

      return [
        ...projectAndDripListSupport,
        ...streamSupport,
        ...oneTimeDonationSupport,
      ];
    },
    latestMetadataIpfsHash: async (parent: User) => {
      const { accountId } = parent.account;
      return getLatestMetadataHash(accountId as AccountId);
    },
  },
  UserStreams: {
    outgoing: async (
      parent: { accountId: AddressDriverId },
      _: any,
      { dataSources }: Context,
    ) => {
      const { accountId } = parent;
      assert(isAddressDriverId(accountId));

      return dataSources.streamsDb.getUserOutgoingStreams(accountId);
    },
    incoming: async (
      parent: { accountId: AddressDriverId },
      _: any,
      { dataSources }: Context,
    ) => {
      const { accountId } = parent;
      assert(isAddressDriverId(accountId));

      return dataSources.streamsDb.getUserIncomingStreams(accountId);
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
