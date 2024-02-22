import gql from 'graphql-tag';
import dripListTypeDef from './drip-list/dripListTypeDef';
import gitProjectTypeDef from './project/projectTypeDef';
import commonTypeDef from './common/commonTypeDef';
import givenEventTypeDef from './given-event/givenEventTypeDef';

const rootTypeDef = gql`
  type Query {
    projectById(id: ID!): Project
    projectByUrl(url: String!): Project
    projects(where: ProjectWhereInput, sort: ProjectSortInput): [Project!]!

    dripList(id: ID!): DripList
    dripLists(where: DripListWhereInput): [DripList!]!

    gives(where: GiveWhereInput): [Give!]!

    mintedTokensCountByOwnerAddress(ownerAddress: String!): Int!

    earnedFunds(projectId: String!): [Amount!]!
  }
`;

const typeDefs = [
  rootTypeDef,
  dripListTypeDef,
  gitProjectTypeDef,
  commonTypeDef,
  givenEventTypeDef,
];

export default typeDefs;
