import type { AccountId } from '../common/types';
import type { Stream } from '../generated/graphql';
import type { ContextValue } from '../server';

const streamResolvers = {
  Query: {
    streamsByAccountId: async (
      _: any,
      { accountId }: { accountId: AccountId },
      { dataSources }: ContextValue,
    ): Promise<Stream[]> =>
      dataSources.streamsDb.getStreamsByAccountId(accountId),
  },
};

export default streamResolvers;
