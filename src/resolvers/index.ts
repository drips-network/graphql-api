import gitProjectResolvers from './gitProjectResolvers';

const resolvers = {
  Query: {
    ...gitProjectResolvers.Query,
  },
  GitProject: {
    ...gitProjectResolvers.GitProject,
  },
  DependencySplitReceiver: {
    ...gitProjectResolvers.DependencySplitReceiver,
  },
};

export default resolvers;
