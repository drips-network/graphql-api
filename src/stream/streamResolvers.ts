import { Driver, type StreamWhereInput } from '../generated/graphql';
import type { Context } from '../server';
import unreachableError from '../utils/unreachableError';

const streamResolvers = {
  Query: {
    streams: async (
      _: any,
      { where }: { where: StreamWhereInput },
      { dataSources }: Context,
    ) => dataSources.streamsDb.getStreamsByFilter(where),
  },
  Stream: {
    receiver: (parent: any, _: any, { dataSources }: Context) => {
      if (parent.receiver.driver === Driver.ADDRESS) {
        return dataSources.usersDb.getUserByAccountId(
          parent.receiver.accountId,
        );
      }

      if (parent.receiver.driver === Driver.NFT) {
        return dataSources.dripListsDb.getDripListById(
          parent.receiver.accountId,
        );
      }

      throw unreachableError();
    },
    sender: (parent: any, _: any, { dataSources }: Context) => {
      if (parent.sender.driver === Driver.ADDRESS) {
        return dataSources.usersDb.getUserByAccountId(parent.sender.accountId);
      }

      if (parent.sender.driver === Driver.NFT) {
        return dataSources.dripListsDb.getDripListById(parent.sender.accountId);
      }

      throw unreachableError();
    },
  },
};

export default streamResolvers;
