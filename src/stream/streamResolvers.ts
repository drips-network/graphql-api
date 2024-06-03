import { Driver, SupportedChain } from '../generated/graphql';
import type { Context } from '../server';
import shouldNeverHappen from '../utils/shouldNeverHappen';

const streamResolvers = {
  Stream: {
    receiver: (parent: any, _: any, { dataSources }: Context) => {
      if (parent.receiver.driver === Driver.ADDRESS) {
        return dataSources.usersDb.getUserByAccountId(
          [SupportedChain.sepolia], // TODO: Temporary for compiling.
          parent.receiver.accountId,
        );
      }

      if (parent.receiver.driver === Driver.NFT) {
        return dataSources.dripListsDb.getDripListById(
          [SupportedChain.sepolia], // TODO: Temporary for compiling.
          parent.receiver.accountId,
        );
      }

      throw shouldNeverHappen();
    },
    sender: (parent: any, _: any, { dataSources }: Context) => {
      if (parent.sender.driver === Driver.ADDRESS) {
        return dataSources.usersDb.getUserByAccountId(
          [SupportedChain.sepolia], // TODO: Temporary for compiling.
          parent.sender.accountId,
        );
      }

      if (parent.sender.driver === Driver.NFT) {
        return dataSources.dripListsDb.getDripListById(
          [SupportedChain.sepolia], // TODO: Temporary for compiling.
          parent.sender.accountId,
        );
      }

      throw shouldNeverHappen();
    },
  },
};

export default streamResolvers;
