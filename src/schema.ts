import dripListTypeDef from './drip-list/dripListTypeDef';
import gitProjectTypeDef from './git-project/gitProjectTypeDef';

const rootType = `#graphql
  type Query {
    gitProjects(where: ProjectWhereInput): [GitProject!],
    gitProject(id: ID!): GitProject,
    dripLists(where: DripListWhereInput): [DripList!],
    dripList(id: ID!): DripList,
  }
`;

const typeDefs = [rootType, dripListTypeDef, gitProjectTypeDef];

export default typeDefs;
