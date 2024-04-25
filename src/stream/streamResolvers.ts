import type { StreamWhereInput } from '../generated/graphql';
import type { Context } from '../server';

const streamResolvers = {
  Query: {
    streams: async (
      _: any,
      { where }: { where: StreamWhereInput },
      { dataSources }: Context,
    ) => dataSources.streamsDb.getStreamsByFilter(where),
  },
};

export default streamResolvers;
