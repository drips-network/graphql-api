import type { AddressDriverId } from '../common/types';
import { Driver, type UserAccount } from '../generated/graphql';
import type { ContextValue } from '../server';
import shouldNeverHappen from '../utils/shouldNeverHappen';

const accountResolvers = {
  Query: {
    account: async (
      _: any,
      { accountId }: { accountId: AddressDriverId },
      { dataSources }: ContextValue,
    ): Promise<UserAccount> => dataSources.accountsDb.getUserAccount(accountId),
  },
  StreamReceiver: {
    __resolveType(parent: { driver: Driver }) {
      if (parent.driver === Driver.ADDRESS) {
        return 'AddressDriverAccount';
      }

      if (parent.driver === Driver.NFT) {
        return 'NftDriverAccount';
      }

      return shouldNeverHappen();
    },
  },
};

export default accountResolvers;
