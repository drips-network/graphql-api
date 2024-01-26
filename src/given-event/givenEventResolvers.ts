import type { GiveWhereInput } from '../generated/graphql';
import type { Context } from '../server';
import type GivenEventModel from './GivenEventModel';

const givenEventResolvers = {
  Query: {
    gives: async (
      _: any,
      { where }: { where: GiveWhereInput },
      { dataSources }: Context,
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
