/* eslint-disable no-console */
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import rateLimit from 'express-rate-limit';
import type {
  NextFunction,
  ParamsDictionary,
  Request,
  Response,
} from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import depthLimit from 'graphql-depth-limit';
import cors from 'cors';
import { BaseError } from 'sequelize';
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
  };
}

const app = express();
const httpServer = http.createServer(app);

const formatError = (formattedError: any, error: any) => {
  // Handle database errors (Sequelize BaseError).
  if (error instanceof BaseError) {
    console.error({
      type: 'DatabaseError',
      source: 'Sequelize',
      message: formattedError.message,
      internalMessage: error.message,
      stack: error.stack,
      path: formattedError.path,
      extensions: formattedError.extensions,
    });

    return { message: 'Internal server error' };
  }

  // Handle unexpected internal server errors.
  if (
    !formattedError.extensions?.code ||
    formattedError.extensions.code === 'INTERNAL_SERVER_ERROR'
  ) {
    console.error({
      type: 'InternalServerError',
      source: 'Generic',
      message: formattedError.message,
      internalMessage: error.originalError?.message,
      stack: error.originalError?.stack,
      path: formattedError.path,
      extensions: formattedError.extensions,
    });

    return { message: 'Internal server error' };
  }

  // Log and return other GraphQL errors as-is.
  console.error({
    type: 'GraphQLError',
    message: formattedError.message,
    path: formattedError.path,
    extensions: formattedError.extensions,
  });

  return formattedError;
};

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

const limiter = rateLimit({
  skipFailedRequests: true,
  windowMs: appSettings.rateLimitWindowInMinutes * 60 * 1000,
  limit: appSettings.rateLimitMaxRequestsPerWindow,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res /* , next */) => {
    res.status(429).json({
      error: {
        message: `Too many requests. Please try again at ${new Date(
          (req as any).rateLimit.resetTime,
        )}`,
        statusCode: 429,
      },
    });
  },
});

const customRateLimiter = (
  req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
  res: Response<any, Record<string, any>, number>,
  next: NextFunction,
) => {
  const apiKey = req.headers.authorization?.split(' ')[1];

  if (apiKey && apiKey === appSettings.dripsApiKey) {
    next();
  } else {
    limiter(req, res, next);
  }
};

const startServer = async () => {
  await connectToDatabase();

  await server.start();

  app.use(customRateLimiter);

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
