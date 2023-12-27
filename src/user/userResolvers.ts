import type { Address, AddressDriverId } from '../common/types';
import type { User } from '../generated/graphql';
import type { ContextValue } from '../server';
import { assertAddressDiverId } from '../utils/assert';
import getUserAddress from '../utils/getUserAddress';

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
  },
  User: {
    streams: async (parent: User) => ({
      accountId: parent.account.accountId,
    }),
    projects: (parent: User, _: any, { dataSources }: ContextValue) => {
      const { accountId } = parent.account;

      assertAddressDiverId(accountId);

      return dataSources.projectsDb.getProjectsByFilter({
        ownerAddress: getUserAddress(accountId),
      });
    },
    dripLists: (parent: User, _: any, { dataSources }: ContextValue) => {
      const { accountId } = parent.account;

      assertAddressDiverId(accountId);

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

      assertAddressDiverId(accountId);

      return dataSources.usersDb.getUserOutgoingStreams(accountId);
    },
    incoming: async (
      parent: { accountId: AddressDriverId },
      _: any,
      { dataSources }: ContextValue,
    ) => {
      const { accountId } = parent;

      assertAddressDiverId(accountId);

      return dataSources.usersDb.getUserIncomingStreams(accountId);
    },
  },
};

export default userResolvers;
