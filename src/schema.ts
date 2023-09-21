import dripListTypeDef from './drip-list/dripListTypeDef';
import gitProjectTypeDef from './git-project/gitProjectTypeDef';

const rootType = `#graphql
  type Query {
    gitProjects: [GitProject!],
    gitProject(id: ID!): GitProject,
    dripLists: [DripList!],
    dripList(id: ID!): DripList,
  }
`;

const typeDefs = [rootType, dripListTypeDef, gitProjectTypeDef];

export default typeDefs;
