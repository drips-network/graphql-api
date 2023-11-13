import { GiveWhereInput } from "../generated/graphql";
import { ContextValue } from "../server";
import GivenEventModel from "./GivenEventModel";

const givenEventResolvers = {
  Query: {
    gives: async (
      _: any,
      { where }: { where: GiveWhereInput },
      { dataSources }: ContextValue,
    ): Promise<(GivenEventModel)[]> =>
      dataSources.given.getGivenEventsByFilter(where),
  }
}
