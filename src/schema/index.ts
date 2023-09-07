import gitProjectTypeDef from './GitProject';

const rootType = `#graphql
  type Query {
    gitProjects: [GitProject!]
    gitProject(id: ID!): GitProject
  }
`;

const typeDefs = [rootType, gitProjectTypeDef];

export default typeDefs;
