import { isAddress } from 'ethers';
import type { GiveWhereInput } from '../generated/graphql';
import type { Context } from '../server';
import assert, { isAccountId } from '../utils/assert';
import type GivenEventModel from './GivenEventModel';

const givenEventResolvers = {
  Query: {
    gives: async (
      _: any,
      { where }: { where: GiveWhereInput },
      { dataSources }: Context,
    ): Promise<GivenEventModel[]> => {
      if (where?.receiverAccountId) {
        assert(isAccountId(where.receiverAccountId));
      }

      if (where?.senderAccountId) {
        assert(isAccountId(where.senderAccountId));
      }

      if (where?.tokenAddress) {
        assert(isAddress(where.tokenAddress));
      }

      return dataSources.givenEventsDb.getGivenEventsByFilter(where);
    },
  },
  Give: {
    sender: () => {
      // TODO: implement.
    },
  },
};

export default givenEventResolvers;
