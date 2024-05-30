import gql from 'graphql-tag';
import dripListTypeDef from './drip-list/dripListTypeDef';
import gitProjectTypeDef from './project/projectTypeDef';
import commonTypeDef from './common/commonTypeDef';
import givenEventTypeDef from './given-event/givenEventTypeDef';
import userTypeDef from './user/userTypeDef';
import streamTypeDef from './stream/streamTypeDef';

const rootTypeDef = gql`
  type Query {
    projects(
      chains: [SupportedChain!]
      where: ProjectWhereInput
      sort: ProjectSortInput
    ): [Project!]!
    projectById(id: ID!, chain: SupportedChain!): Project
    projectByUrl(url: String!, chain: SupportedChain!): Project
    dripLists(
      chains: [SupportedChain!]
      where: DripListWhereInput
    ): [DripList!]!
    dripList(id: ID!, chain: SupportedChain!): DripList
    mintedTokensCountByOwnerAddress(ownerAddress: String!): Int!
    earnedFunds(projectId: String!): [Amount!]!
    userById(accountId: ID!): User!
    userByAddress(address: String!): User!
    streams(where: StreamWhereInput): [Stream!]!
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
];

export default typeDefs;
