import gql from 'graphql-tag';
import dripListTypeDef from './drip-list/dripListTypeDef';
import gitProjectTypeDef from './project/projectTypeDef';
import commonTypeDef from './common/commonTypeDef';

const rootType = gql`
  type Query {
    project(id: ID!): Project
    projectByUrl(url: String!): Project
    projects(where: ProjectWhereInput): [Project!]

    dripList(id: ID!): DripList
    dripLists(where: DripListWhereInput): [DripList!]
  }
`;

const typeDefs = [rootType, dripListTypeDef, gitProjectTypeDef, commonTypeDef];

export default typeDefs;
