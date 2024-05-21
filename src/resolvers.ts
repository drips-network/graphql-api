import estimatesResolvers from './balances/estimatesResolvers';
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
    ...estimatesResolvers.Query,
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
  OneTimeDonationSupport: commonResolvers.OneTimeDonationSupport,
  Date: dateScalar,
  User: userResolvers.User,
  UserStreams: userResolvers.UserStreams,
  StreamReceiver: userResolvers.StreamReceiver,
};

export default resolvers;
