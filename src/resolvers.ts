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
  ProjectChainData: projectResolvers.ProjectChainData,
  ClaimedProjectData: projectResolvers.ClaimedProjectData,
  ClaimedChainProjectData: projectResolvers.ClaimedChainProjectData,
  UnClaimedProjectData: projectResolvers.UnClaimedProjectData,
  UnClaimedChainProjectData: projectResolvers.UnClaimedChainProjectData,
  DripList: dripListResolvers.DripList,
  SplitsReceiver: projectResolvers.SplitsReceiver,
  SupportItem: commonResolvers.SupportItem,
  Avatar: projectResolvers.Avatar,
  ProjectSupport: commonResolvers.ProjectSupport,
  DripListSupport: commonResolvers.DripListSupport,
  StreamSupport: commonResolvers.StreamSupport,
  OneTimeDonationSupport: commonResolvers.OneTimeDonationSupport,
  Date: dateScalar,
  User: userResolvers.User,
  UserStreams: userResolvers.UserStreams,
  Stream: streamResolvers.Stream,
  StreamReceiver: userResolvers.StreamReceiver,
};

export default resolvers;
