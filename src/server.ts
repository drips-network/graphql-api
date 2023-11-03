import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import resolvers from './resolvers';
import typeDefs from './schema';
import config from './common/config';
import ProjectsDataSource from './dataLoaders/ProjectsDataSource';
import connectToDatabase from './database/connectToDatabase';
import ReceiversOfTypeProjectDataSource from './dataLoaders/ReceiversOfTypeProjectDataSource';
import ReceiversOfTypeAddressDataSource from './dataLoaders/ReceiversOfTypeAddressDataSource';
import DripListsDataSource from './dataLoaders/DripListsDataSource';
import ReceiversOfTypeDripListDataSource from './dataLoaders/ReceiversOfTypeDripListDataSource';

export interface ContextValue {
  dataSources: {
    projectsDb: ProjectsDataSource;
    dripListsDb: DripListsDataSource;
    receiversOfTypeAddressDb: ReceiversOfTypeAddressDataSource;
    receiversOfTypeProjectDb: ReceiversOfTypeProjectDataSource;
    receiversOfTypeDripListDb: ReceiversOfTypeDripListDataSource;
  };
}

const server = new ApolloServer<ContextValue>({
  introspection: true,
  typeDefs,
  resolvers,
});

const startServer = async () => {
  await connectToDatabase();

  const { url } = await startStandaloneServer(server, {
    listen: { port: config.port },
    context: async ({ req }) => {
      const apiKey = req.headers.authorization?.split(' ')[1];

      if (!apiKey || !config.apiKeys.includes(apiKey)) {
        throw new Error('Unauthorized');
      }

      return {
        dataSources: {
          projectsDb: new ProjectsDataSource(),
          dripListsDb: new DripListsDataSource(),
          receiversOfTypeAddressDb: new ReceiversOfTypeAddressDataSource(),
          receiversOfTypeProjectDb: new ReceiversOfTypeProjectDataSource(),
          receiversOfTypeDripListDb: new ReceiversOfTypeDripListDataSource(),
        },
      };
    },
  });

  console.log(`config: ${JSON.stringify(config, null, 2)}`);
  console.log(`🚀 Server ready at: ${url}`);
};

export default startServer;
