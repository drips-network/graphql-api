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
      limit: Int = 100
    ): [Project!]!
    projectById(id: ID!, chains: [SupportedChain!]): Project
    projectByUrl(url: String!, chains: [SupportedChain!]): Project
    earnedFunds(projectId: String!, chains: [SupportedChain!]): [ChainAmount!]!
    dripLists(
      chains: [SupportedChain!]
      where: DripListWhereInput
      sort: DripListSortInput
      limit: Int = 100
    ): [DripList!]!
    dripList(id: ID!, chain: SupportedChain!): DripList
    mintedTokensCountByOwnerAddress(
      ownerAddress: String!
      chain: SupportedChain!
    ): MintedTokens!
    userById(accountId: ID!, chains: [SupportedChain!]): User!
    userByAddress(address: String!, chains: [SupportedChain!]): User!
    streams(where: StreamWhereInput, chains: [SupportedChain!]): [Stream!]!
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
