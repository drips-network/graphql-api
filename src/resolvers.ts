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
  },
  Project: projectResolvers.Project,
  ProjectChainData: projectResolvers.ProjectChainData,
  ClaimedProjectData: projectResolvers.ClaimedProjectData,
  ClaimedProjectChainData: projectResolvers.ClaimedProjectChainData,
  UnClaimedProjectData: projectResolvers.UnClaimedProjectData,
  UnClaimedProjectChainData: projectResolvers.UnClaimedProjectChainData,
  DripList: dripListResolvers.DripList,
  DripListChainData: dripListResolvers.DripListChainData,
  DripListData: dripListResolvers.DripListData,
  SplitsReceiver: projectResolvers.SplitsReceiver,
  SupportItem: commonResolvers.SupportItem,
  Avatar: projectResolvers.Avatar,
  ProjectSupport: commonResolvers.ProjectSupport,
  DripListSupport: commonResolvers.DripListSupport,
  StreamSupport: commonResolvers.StreamSupport,
  OneTimeDonationSupport: commonResolvers.OneTimeDonationSupport,
  Date: dateScalar,
  User: userResolvers.User,
  UserChainData: userResolvers.UserChainData,
  UserData: userResolvers.UserData,
  UserStreams: userResolvers.UserStreams,
  Stream: streamResolvers.Stream,
  StreamReceiver: userResolvers.StreamReceiver,
};

export default resolvers;
