import type { AddressDriverId, DripListId } from '../common/types';
import { Driver } from '../generated/graphql';
import type { Context } from '../server';
import type { ProtoStream } from '../utils/buildAssetConfigs';
import shouldNeverHappen from '../utils/shouldNeverHappen';

const streamResolvers = {
  Stream: {
    receiver: (
      { chain, receiver }: ProtoStream,
      _: any,
      { dataSources }: Context,
    ) => {
      if (receiver.driver === Driver.ADDRESS) {
        return dataSources.usersDataSource.getUserByAccountId(
          [chain],
          receiver.accountId as AddressDriverId,
        );
      }

      if (receiver.driver === Driver.NFT) {
        return dataSources.dripListsDataSource.getDripListById(
          [chain],
          receiver.accountId as DripListId,
        );
      }

      throw shouldNeverHappen();
    },
    sender: (
      { chain, sender }: ProtoStream,
      _: any,
      { dataSources }: Context,
    ) => {
      if (sender.driver === Driver.ADDRESS) {
        return dataSources.usersDataSource.getUserByAccountId(
          [chain],
          sender.accountId as AddressDriverId,
        );
      }

      if (sender.driver === Driver.NFT) {
        return dataSources.dripListsDataSource.getDripListById(
          [chain],
          sender.accountId as DripListId,
        );
      }

      throw shouldNeverHappen();
    },
  },
};

export default streamResolvers;
