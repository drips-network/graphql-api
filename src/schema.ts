import gql from 'graphql-tag';
import dripListTypeDef from './drip-list/dripListTypeDef';
import gitProjectTypeDef from './project/projectTypeDef';
import commonTypeDef from './common/commonTypeDef';
import givenEventTypeDef from './given-event/givenEventTypeDef';
import accountTypeDef from './account/accountTypeDef';
import userTypeDef from './user/userTypeDef';

const rootTypeDef = gql`
  type Query {
    projectById(id: ID!): Project
    projectByUrl(url: String!): Project
    projects(where: ProjectWhereInput): [Project!]!
    dripList(id: ID!): DripList
    dripLists(where: DripListWhereInput): [DripList!]!
    gives(where: GiveWhereInput): [Give!]!
    account(accountId: ID!): UserAccount
    userById(accountId: ID!): User!
    userByAddress(address: String!): User!
  }
`;

const typeDefs = [
  rootTypeDef,
  dripListTypeDef,
  gitProjectTypeDef,
  commonTypeDef,
  givenEventTypeDef,
  accountTypeDef,
  userTypeDef,
];

export default typeDefs;
