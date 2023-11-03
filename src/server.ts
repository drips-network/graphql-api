import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import resolvers from './resolvers';
import { initDb } from './database';
import typeDefs from './schema';
import config from './common/config';
import {
  nftDriverSplitReceiversByProjectDataLoader,
  projectsByIdsDataLoader,
  repoDriverSplitReceiversByProjectIdsDataLoader,
  addressDriverSplitReceiversByProjectIdsDataLoader,
} from './project/projectDataLoaders';
import {
  nftDriverSplitReceiversByDripListIdsDataLoader,
  dripListsByIdsDataLoader,
  addressDriverSplitReceiversByDripListIdsDataLoader,
  repoDriverSplitReceiversByDripListIdsDataLoader,
} from './drip-list/dripListDataLoaders';

export interface ContextValue {
  loaders: {
    projectsByIdsLoader: ReturnType<typeof projectsByIdsDataLoader>;
    addressDriverSplitReceiversByProjectIdsLoader: ReturnType<
      typeof addressDriverSplitReceiversByProjectIdsDataLoader
    >;
    repoDriverSplitReceiversByProjectIdsLoader: ReturnType<
      typeof repoDriverSplitReceiversByProjectIdsDataLoader
    >;
    nftDriverSplitReceiversByProjectDataLoader: ReturnType<
      typeof nftDriverSplitReceiversByProjectDataLoader
    >;
    dripListsByIdsLoader: ReturnType<typeof dripListsByIdsDataLoader>;
    addressDriverSplitReceiversByDripListIdsLoader: ReturnType<
      typeof addressDriverSplitReceiversByDripListIdsDataLoader
    >;
    repoDriverSplitReceiversByDripListIdsLoader: ReturnType<
      typeof repoDriverSplitReceiversByDripListIdsDataLoader
    >;
    nftDriverSplitReceiversByDripListIdsLoader: ReturnType<
      typeof nftDriverSplitReceiversByDripListIdsDataLoader
    >;
  };
}

const server = new ApolloServer<ContextValue>({
  introspection: true,
  typeDefs,
  resolvers,
});

const startServer = async () => {
  await initDb();

  const { url } = await startStandaloneServer(server, {
    listen: { port: config.port },
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
          nftDriverSplitReceiversByProjectDataLoader:
            nftDriverSplitReceiversByProjectDataLoader(),
          dripListsByIdsLoader: dripListsByIdsDataLoader(),
          addressDriverSplitReceiversByDripListIdsLoader:
            addressDriverSplitReceiversByDripListIdsDataLoader(),
          repoDriverSplitReceiversByDripListIdsLoader:
            repoDriverSplitReceiversByDripListIdsDataLoader(),
          nftDriverSplitReceiversByDripListIdsLoader:
            nftDriverSplitReceiversByDripListIdsDataLoader(),
        },
      };
    },
  });

  console.log(`config: ${JSON.stringify(config, null, 2)}`);
  console.log(`🚀 Server ready at: ${url}`);
};

export default startServer;
