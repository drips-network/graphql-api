import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import resolvers from './resolvers';
import { initDb } from './database';
import typeDefs from './schema';

const server = new ApolloServer({ typeDefs, resolvers });

const startServer = async () => {
  initDb();

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });

  console.log(`🚀  Server ready at: ${url}`);
};

export default startServer;
