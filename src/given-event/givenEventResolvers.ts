import type { GiveWhereInput } from '../generated/graphql';
import type { ContextValue } from '../server';
import type GivenEventModel from './GivenEventModel';

const givenEventResolvers = {
  Query: {
    gives: async (
      _: any,
      { where }: { where: GiveWhereInput },
      { dataSources }: ContextValue,
    ): Promise<GivenEventModel[]> =>
      dataSources.givenEventsDb.getGivenEventsByFilter(where),
  },
  Give: {
    sender: () => {
      // TODO: implement.
    },
  },
};

export default givenEventResolvers;
