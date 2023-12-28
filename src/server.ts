/* eslint-disable no-console */
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import resolvers from './resolvers';
import typeDefs from './schema';
import appSettings from './common/appSettings';
import ProjectsDataSource from './dataSources/ProjectsDataSource';
import connectToDatabase from './database/connectToDatabase';
import ReceiversOfTypeProjectDataSource from './dataSources/ReceiversOfTypeProjectDataSource';
import ReceiversOfTypeAddressDataSource from './dataSources/ReceiversOfTypeAddressDataSource';
import DripListsDataSource from './dataSources/DripListsDataSource';
import ReceiversOfTypeDripListDataSource from './dataSources/ReceiversOfTypeDripListDataSource';
import GivenEventsDataSource from './dataSources/GivenEventsDataSource';
import ProjectAndDripListSupportDataSource from './dataSources/ProjectAndDripListSupportDataSource';
import UsersDataSource from './dataSources/UserDataSource';
import StreamsDataSource from './dataSources/StreamsDataSource';

export interface ContextValue {
  dataSources: {
    projectsDb: ProjectsDataSource;
    givenEventsDb: GivenEventsDataSource;
    dripListsDb: DripListsDataSource;
    receiversOfTypeAddressDb: ReceiversOfTypeAddressDataSource;
    receiversOfTypeProjectDb: ReceiversOfTypeProjectDataSource;
    receiversOfTypeDripListDb: ReceiversOfTypeDripListDataSource;
    projectAndDripListSupportDb: ProjectAndDripListSupportDataSource;
    givesDb: GivenEventsDataSource;
    usersDb: UsersDataSource;
    streamsDb: StreamsDataSource;
  };
}

const server = new ApolloServer<ContextValue>({
  introspection: true,
  typeDefs,
  resolvers,
  plugins: [
    appSettings.environment === 'mainnet'
      ? ApolloServerPluginLandingPageProductionDefault()
      : ApolloServerPluginLandingPageLocalDefault(),
  ],
});

const startServer = async () => {
  await connectToDatabase();

  const { url } = await startStandaloneServer(server, {
    listen: { port: appSettings.port },
    context: async ({ req }) => {
      const apiKey = req.headers.authorization?.split(' ')[1];

      if (!apiKey || !appSettings.apiKeys.includes(apiKey)) {
        throw new Error('Unauthorized');
      }

      return {
        dataSources: {
          projectsDb: new ProjectsDataSource(),
          givenEventsDb: new GivenEventsDataSource(),
          dripListsDb: new DripListsDataSource(),
          receiversOfTypeAddressDb: new ReceiversOfTypeAddressDataSource(),
          receiversOfTypeProjectDb: new ReceiversOfTypeProjectDataSource(),
          receiversOfTypeDripListDb: new ReceiversOfTypeDripListDataSource(),
          projectAndDripListSupportDb:
            new ProjectAndDripListSupportDataSource(),
          givesDb: new GivenEventsDataSource(),
          usersDb: new UsersDataSource(),
          streamsDb: new StreamsDataSource(),
        },
      };
    },
  });

  console.log(`config: ${JSON.stringify(appSettings, null, 2)}`);
  console.log(`🚀 Server ready at: ${url}`);
};

export default startServer;
