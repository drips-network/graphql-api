import commonResolvers from './common/commonResolvers';
import dripListResolvers from './drip-list/dripListResolvers';
import projectResolvers from './project/projectResolvers';

const resolvers = {
  Query: {
    ...projectResolvers.Query,
    ...dripListResolvers.Query,
  },
  Project: projectResolvers.Project,
  DripList: dripListResolvers.DripList,
  SplitsReceiver: projectResolvers.SplitsReceiver,
  ClaimedProject: projectResolvers.ClaimedProject,
  UnclaimedProject: projectResolvers.UnclaimedProject,
  SupportItem: commonResolvers.SupportItem,
  ProjectSupport: commonResolvers.ProjectSupport,
  DripListSupport: commonResolvers.DripListSupport,
};

export default resolvers;
