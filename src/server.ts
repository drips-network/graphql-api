import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import resolvers from './resolvers';
import { initDb } from './database';
import typeDefs from './schema';
import config from './common/config';
import {
  projectsByIdsDataLoader,
  repoDriverSplitReceiversByProjectIdsDataLoader,
  addressDriverSplitReceiversByProjectIdsDataLoader,
} from './project/projectDataLoaders';

export interface ContextValue {
  loaders: {
    projectsByIdsLoader: ReturnType<typeof projectsByIdsDataLoader>;
    addressDriverSplitReceiversByProjectIdsLoader: ReturnType<
      typeof addressDriverSplitReceiversByProjectIdsDataLoader
    >;
    repoDriverSplitReceiversByProjectIdsLoader: ReturnType<
      typeof repoDriverSplitReceiversByProjectIdsDataLoader
    >;
  };
}

const server = new ApolloServer<ContextValue>({
  typeDefs,
  resolvers,
});

const startServer = async () => {
  await initDb();

  const { url } = await startStandaloneServer(server, {
    listen: { port: config.port || 8080 },
    context: async ({ req }) => {
      const apiKey = req.headers.authorization?.split(' ')[1];

      if (!apiKey || !config.apiKeys.includes(apiKey)) {
        throw new Error('Unauthorized');
      }

      return {
        loaders: {
          projectsByIdsLoader: projectsByIdsDataLoader(),
          addressDriverSplitReceiversByProjectIdsLoader:
            addressDriverSplitReceiversByProjectIdsDataLoader(),
          repoDriverSplitReceiversByProjectIdsLoader:
            repoDriverSplitReceiversByProjectIdsDataLoader(),
        },
      };
    },
  });

  console.log(`🚀 Server ready at: ${url}`);
};

export default startServer;
