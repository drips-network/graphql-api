import gql from 'graphql-tag';
import dripListTypeDef from './drip-list/dripListTypeDef';
import gitProjectTypeDef from './project/projectTypeDef';
import commonTypeDef from './common/commonTypeDef';
import givenEventTypeDef from './given-event/givenEventTypeDef';
import userTypeDef from './user/userTypeDef';
import streamTypeDef from './stream/streamTypeDef';
import estimatesTypeDef from './balances/estimatesTypeDef';

const rootTypeDef = gql`
  type Query {
    projectById(id: ID!): Project
    projectByUrl(url: String!): Project
    projects(where: ProjectWhereInput): [Project!]!
    dripList(id: ID!): DripList
    dripLists(where: DripListWhereInput): [DripList!]!
    gives(where: GiveWhereInput): [Give!]!
    userById(accountId: ID!): User!
    userByAddress(address: String!): User!
    userAccount(accountId: ID!): UserAccount
    streams(where: StreamWhereInput): [Stream!]!
    accountEstimate(accountId: ID!): AccountEstimate
  }
`;

const typeDefs = [
  rootTypeDef,
  dripListTypeDef,
  gitProjectTypeDef,
  commonTypeDef,
  givenEventTypeDef,
  userTypeDef,
  streamTypeDef,
  estimatesTypeDef,
];

export default typeDefs;
