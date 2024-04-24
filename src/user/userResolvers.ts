import type { Address, AddressDriverId } from '../common/types';
import { Driver, type User } from '../generated/graphql';
import type { Context } from '../server';
import assert, { isAddressDriverId } from '../utils/assert';
import getUserAddress from '../utils/getUserAddress';
import shouldNeverHappen from '../utils/shouldNeverHappen';

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
    streams: async (parent: User) => ({
      accountId: parent.account.accountId,
    }),
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
