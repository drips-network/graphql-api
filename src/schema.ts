import gql from 'graphql-tag';
import dripListTypeDef from './drip-list/dripListTypeDef';
import gitProjectTypeDef from './project/projectTypeDef';
import commonTypeDef from './common/typeDef';

const rootType = gql`
  type Query {
    projects(where: ProjectWhereInput): [Project!]
    project(id: ID!): Project
    dripLists(where: DripListWhereInput): [DripList!]
    dripList(id: ID!): DripList
  }
`;

const typeDefs = [rootType, dripListTypeDef, gitProjectTypeDef, commonTypeDef];

export default typeDefs;
