import gql from 'graphql-tag';
import dripListTypeDef from './drip-list/dripListTypeDef';
import gitProjectTypeDef from './project/projectTypeDef';
import commonTypeDef from './common/commonTypeDef';
import givenEventTypeDef from './given-event/givenEventTypeDef';
import streamsTypeDef from './stream/streamTypeDef';

const rootTypeDef = gql`
  type Query {
    projectById(id: ID!): Project
    projectByUrl(url: String!): Project
    projects(where: ProjectWhereInput): [Project!]!
    dripList(id: ID!): DripList
    dripLists(where: DripListWhereInput): [DripList!]!
    gives(where: GiveWhereInput): [Give!]!
    streamsByAccountId(accountId: ID!): [Stream!]!
  }
`;

const typeDefs = [
  rootTypeDef,
  dripListTypeDef,
  gitProjectTypeDef,
  commonTypeDef,
  givenEventTypeDef,
  streamsTypeDef,
];

export default typeDefs;
