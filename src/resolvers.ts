import commonResolvers from './common/commonResolvers';
import dateScalar from './common/date';
import dripListResolvers from './drip-list/dripListResolvers';
import ecosystemResolvers from './ecosystem/ecosystemResolvers';
import projectResolvers from './project/projectResolvers';
import streamResolvers from './stream/streamResolvers';
import userResolvers from './user/userResolvers';

const resolvers = {
  Query: {
    ...projectResolvers.Query,
    ...dripListResolvers.Query,
    ...ecosystemResolvers.Query,
    ...userResolvers.Query,
    ...streamResolvers.Query,
  },
  Project: projectResolvers.Project,
  ProjectReceiver: commonResolvers.ProjectReceiver,
  ProjectData: projectResolvers.ProjectData,
  ClaimedProjectData: projectResolvers.ClaimedProjectData,
  UnClaimedProjectData: projectResolvers.UnClaimedProjectData,
  DripList: dripListResolvers.DripList,
  DripListReceiver: commonResolvers.DripListReceiver,
  SplitsReceiver: commonResolvers.SplitsReceiver,
  SupportItem: commonResolvers.SupportItem,
  Avatar: projectResolvers.Avatar,
  ProjectSupport: commonResolvers.ProjectSupport,
  DripListSupport: commonResolvers.DripListSupport,
  StreamSupport: commonResolvers.StreamSupport,
  OneTimeDonationSupport: commonResolvers.OneTimeDonationSupport,
  Date: dateScalar,
  User: userResolvers.User,
  UserData: userResolvers.UserData,
  UserStreams: userResolvers.UserStreams,
  Stream: streamResolvers.Stream,
  StreamReceiver: userResolvers.StreamReceiver,
  AddressReceiver: commonResolvers.AddressReceiver,
  EcosystemMainAccount: ecosystemResolvers.EcosystemMainAccount,
};

export default resolvers;
