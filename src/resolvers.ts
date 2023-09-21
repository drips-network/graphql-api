import dripListResolvers from './drip-list/dripListResolvers';
import gitProjectResolvers from './git-project/gitProjectResolvers';

const resolvers = {
  Query: {
    ...gitProjectResolvers.Query,
    ...dripListResolvers.Query,
  },
};

export default resolvers;
