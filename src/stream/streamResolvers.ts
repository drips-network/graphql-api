import queryableChains from '../common/queryableChains';
import type { AddressDriverId, DripListId } from '../common/types';
import { toResolverDripList } from '../drip-list/dripListUtils';
import type { StreamWhereInput, SupportedChain } from '../generated/graphql';
import { Driver } from '../generated/graphql';
import type { Context } from '../server';
import toResolverUser from '../user/userUtils';
import type { ProtoStream } from '../utils/buildAssetConfigs';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import verifyStreamsInput from './streamValidators';

const streamResolvers = {
  Query: {
    streams: async (
      _: any,
      { where, chains }: { where: StreamWhereInput; chains?: SupportedChain[] },
      { dataSources: { streamsDataSource } }: Context,
    ) => {
      verifyStreamsInput({ where, chains });

      const chainsToQuery = chains?.length ? chains : queryableChains;

      const streamsByChain = await streamsDataSource.getStreamsByFilter(
        chainsToQuery,
        where,
      );

      return Object.entries(streamsByChain).map(([chain, streams]) => ({
        chain,
        data: streams,
      }));
    },
  },
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
            receiver.accountId as DripListId,
            [chain],
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
