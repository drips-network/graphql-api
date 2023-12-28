import commonResolvers from './common/commonResolvers';
import dateScalar from './common/date';
import dripListResolvers from './drip-list/dripListResolvers';
import projectResolvers from './project/projectResolvers';
import streamResolvers from './stream/streamResolvers';
import userResolvers from './user/userResolvers';

const resolvers = {
  Query: {
    ...projectResolvers.Query,
    ...dripListResolvers.Query,
    ...userResolvers.Query,
    ...streamResolvers.Query,
  },
  Project: projectResolvers.Project,
  DripList: dripListResolvers.DripList,
  SplitsReceiver: projectResolvers.SplitsReceiver,
  ClaimedProject: projectResolvers.ClaimedProject,
  UnclaimedProject: projectResolvers.UnclaimedProject,
  SupportItem: commonResolvers.SupportItem,
  ProjectSupport: commonResolvers.ProjectSupport,
  DripListSupport: commonResolvers.DripListSupport,
  OneTimeDonationSupport: commonResolvers.OneTimeDonationSupport,
  StreamReceiver: userResolvers.StreamReceiver,
  Date: dateScalar,
  User: userResolvers.User,
  UserStreams: userResolvers.UserStreams,
};

export default resolvers;
