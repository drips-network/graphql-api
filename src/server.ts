/* eslint-disable no-console */
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import depthLimit from 'graphql-depth-limit';
import cors from 'cors';
import resolvers from './resolvers';
import typeDefs from './schema';
import appSettings from './common/appSettings';
import ProjectsDataSource from './dataLoaders/ProjectsDataSource';
import { connectToDatabase } from './database/connectToDatabase';
import SplitsReceiversDataSource from './dataLoaders/SplitsReceiversDataSource';
import DripListsDataSource from './dataLoaders/DripListsDataSource';
import GivenEventsDataSource from './dataLoaders/GivenEventsDataSource';
import SupportDataSource from './dataLoaders/SupportDataSource';
import UsersDataSource from './user/UserDataSource';
import StreamsDataSource from './stream/StreamsDataSource';
import TotalEarnedDataSource from './dataLoaders/TotalEarnedDataSource';
import EcosystemsDataSource from './dataLoaders/EcosystemsDataSource';
import SubListsDataSource from './dataLoaders/SubListsDataSource';
import LinkedIdentityDataSource from './dataLoaders/LinkedIdentityDataSource';
import formatError from './utils/formatError';

export interface Context {
  dataSources: {
    projectsDataSource: ProjectsDataSource;
    givenEventsDataSource: GivenEventsDataSource;
    dripListsDataSource: DripListsDataSource;
    splitsReceiversDataSource: SplitsReceiversDataSource;
    supportDataSource: SupportDataSource;
    usersDataSource: UsersDataSource;
    streamsDataSource: StreamsDataSource;
    totalEarnedDataSource: TotalEarnedDataSource;
    ecosystemsDataSource: EcosystemsDataSource;
    subListsDataSource: SubListsDataSource;
    linkedIdentitiesDataSource: LinkedIdentityDataSource;
  };
}

const app = express();
const httpServer = http.createServer(app);

const server = new ApolloServer<Context>({
  formatError,
  introspection: true,
  validationRules: [depthLimit(appSettings.maxQueryDepth)],
  typeDefs,
  resolvers,
  plugins: [
    ApolloServerPluginLandingPageLocalDefault(),
    ApolloServerPluginDrainHttpServer({ httpServer }),
  ],
});

const startServer = async () => {
  await connectToDatabase();

  await server.start();

  app.use((req, res, next) => {
    res.setTimeout(appSettings.timeoutInSeconds * 1000, () => {
      res.send(408);
    });

    next();
  });

  app.set('trust proxy', 1);

  app.route('/health').get((_, res) => {
    try {
      server.assertStarted('/health');
    } catch (error) {
      res.status(500).send('Server not ready');
      return;
    }

    res.status(200).send('OK');
  });

  app.use(
    '/',
    cors<cors.CorsRequest>(),
    bodyParser.json({ limit: '50mb' }),
    expressMiddleware(server, {
      context: async () => ({
        dataSources: {
          projectsDataSource: new ProjectsDataSource(),
          givenEventsDataSource: new GivenEventsDataSource(),
          dripListsDataSource: new DripListsDataSource(),
          splitsReceiversDataSource: new SplitsReceiversDataSource(),
          supportDataSource: new SupportDataSource(),
          givesDb: new GivenEventsDataSource(),
          usersDataSource: new UsersDataSource(),
          streamsDataSource: new StreamsDataSource(),
          totalEarnedDataSource: new TotalEarnedDataSource(),
          ecosystemsDataSource: new EcosystemsDataSource(),
          subListsDataSource: new SubListsDataSource(),
          linkedIdentitiesDataSource: new LinkedIdentityDataSource(),
        },
      }),
    }),
  );

  await new Promise<void>((resolve) =>
    // eslint-disable-next-line no-promise-executor-return
    httpServer.listen(appSettings.port, '::', resolve),
  );

  console.log(`config: ${JSON.stringify(appSettings, null, 2)}`);
  console.log(`🚀 Server ready at http://localhost:${appSettings.port}/`);
};

export default startServer;
