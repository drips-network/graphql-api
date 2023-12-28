import type { StreamWhereInput } from '../generated/graphql';
import type { ContextValue } from '../server';

const streamResolvers = {
  Query: {
    streams: async (
      _: any,
      { where }: { where: StreamWhereInput },
      { dataSources }: ContextValue,
    ) => dataSources.streamsDb.getStreamsByFilter(where),
  },
};

export default streamResolvers;
