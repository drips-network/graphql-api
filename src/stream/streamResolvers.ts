import type { AddressDriverId, DripListId } from '../common/types';
import { toResolverDripList } from '../drip-list/dripListUtils';
import { Driver } from '../generated/graphql';
import type { Context } from '../server';
import toResolverUser from '../user/userUtils';
import type { ProtoStream } from '../utils/buildAssetConfigs';
import shouldNeverHappen from '../utils/shouldNeverHappen';

const streamResolvers = {
  Stream: {
    receiver: async (
      { chain, receiver }: ProtoStream,
      _: {},
      { dataSources }: Context,
    ) => {
      if (receiver.driver === Driver.ADDRESS) {
        return toResolverUser([chain], receiver.accountId as AddressDriverId);
      }

      if (receiver.driver === Driver.NFT) {
        const dbDripList =
          await dataSources.dripListsDataSource.getDripListById(
            [chain],
            receiver.accountId as DripListId,
          );

        return toResolverDripList(chain, dbDripList);
      }

      throw shouldNeverHappen();
    },
    sender: async ({ chain, sender }: ProtoStream) => {
      if (sender.driver === Driver.ADDRESS) {
        return toResolverUser([chain], sender.accountId as AddressDriverId);
      }

      throw shouldNeverHappen();
    },
  },
};

export default streamResolvers;
