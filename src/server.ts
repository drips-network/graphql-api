import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import resolvers from './resolvers';
import { initDb } from './database';
import typeDefs from './schema';
import config from './common/config';

const server = new ApolloServer({ typeDefs, resolvers });

const startServer = async () => {
  await initDb();

  const { url } = await startStandaloneServer(server, {
    listen: { port: config.port || 8080 },
  });

  console.log(`🚀 Server ready at: ${url}`);
};

export default startServer;
