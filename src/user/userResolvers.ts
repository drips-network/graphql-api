import { assetOutgoingBalanceTimeline } from '../balances/estimate-reloaded';
import type { AccountId, Address, AddressDriverId } from '../common/types';
import DripListModel from '../drip-list/DripListModel';
import { Driver } from '../generated/graphql';
import type { User } from '../generated/graphql';
import type { Context } from '../server';
import assert, { isAddressDriverId } from '../utils/assert';
import getAssetConfigs from '../utils/getAssetConfigs';
import getLatestAccountMetadata from '../utils/getLatestAccountMetadata';
import getUserAddress from '../utils/getUserAddress';

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
    balances: async (parent: User) => {
      const { metadata } =
        (await getLatestAccountMetadata(
          parent.account.accountId as AddressDriverId,
        )) ?? {};
      const assetConfigs = await getAssetConfigs(
        parent.account.accountId as AddressDriverId,
        metadata,
      );

      return assetConfigs.map((ac) => ({
        tokenAddress: ac.tokenAddress,
        incoming: [],
        outgoing: assetOutgoingBalanceTimeline(ac.history),
      }));
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
