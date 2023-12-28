import type { Address, AddressDriverId } from '../common/types';
import { Driver, type User, type UserAccount } from '../generated/graphql';
import type { ContextValue } from '../server';
import { assertIsAddressDriverId } from '../utils/assert';
import getUserAddress from '../utils/getUserAddress';
import shouldNeverHappen from '../utils/shouldNeverHappen';

const userResolvers = {
  Query: {
    userById: async (
      _: any,
      { accountId }: { accountId: AddressDriverId },
      { dataSources }: ContextValue,
    ): Promise<User> => dataSources.usersDb.getUserByAccountId(accountId),
    userByAddress: async (
      _: any,
      { address }: { address: Address },
      { dataSources }: ContextValue,
    ): Promise<User> => dataSources.usersDb.getUserByAccountAddress(address),
    userAccount: async (
      _: any,
      { accountId }: { accountId: AddressDriverId },
      { dataSources }: ContextValue,
    ): Promise<UserAccount> => dataSources.usersDb.getUserAccount(accountId),
  },
  User: {
    streams: async (parent: User) => ({
      accountId: parent.account.accountId,
    }),
    projects: (parent: User, _: any, { dataSources }: ContextValue) => {
      const { accountId } = parent.account;
      assertIsAddressDriverId(accountId);

      return dataSources.projectsDb.getProjectsByFilter({
        ownerAddress: getUserAddress(accountId),
      });
    },
    dripLists: (parent: User, _: any, { dataSources }: ContextValue) => {
      const { accountId } = parent.account;
      assertIsAddressDriverId(accountId);

      return dataSources.dripListsDb.getDripListsByFilter({
        ownerAddress: getUserAddress(accountId),
      });
    },
  },
  UserStreams: {
    outgoing: async (
      parent: { accountId: AddressDriverId },
      _: any,
      { dataSources }: ContextValue,
    ) => {
      const { accountId } = parent;
      assertIsAddressDriverId(accountId);

      return dataSources.streamsDb.getUserOutgoingStreams(accountId);
    },
    incoming: async (
      parent: { accountId: AddressDriverId },
      _: any,
      { dataSources }: ContextValue,
    ) => {
      const { accountId } = parent;
      assertIsAddressDriverId(accountId);

      return dataSources.streamsDb.getUserIncomingStreams(accountId);
    },
  },
  StreamReceiver: {
    __resolveType(parent: { driver: Driver }) {
      if (parent.driver === Driver.ADDRESS) {
        return 'AddressDriverAccount';
      }

      if (parent.driver === Driver.NFT) {
        return 'NftDriverAccount';
      }

      return shouldNeverHappen(
        `Cannot resolve 'StreamReceiver' type for driver '${parent.driver}'.`,
      );
    },
  },
};

export default userResolvers;
