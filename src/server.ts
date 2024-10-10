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
import ReceiversOfTypeProjectDataSource from './dataLoaders/ReceiversOfTypeProjectDataSource';
import ReceiversOfTypeAddressDataSource from './dataLoaders/ReceiversOfTypeAddressDataSource';
import DripListsDataSource from './dataLoaders/DripListsDataSource';
import ReceiversOfTypeDripListDataSource from './dataLoaders/ReceiversOfTypeDripListDataSource';
import GivenEventsDataSource from './dataLoaders/GivenEventsDataSource';
import ProjectAndDripListSupportDataSource from './dataLoaders/ProjectAndDripListSupportDataSource';
import UsersDataSource from './user/UserDataSource';
import StreamsDataSource from './stream/StreamsDataSource';
import TotalEarnedDataSource from './dataLoaders/TotalEarnedDataSource';

export interface Context {
  dataSources: {
    projectsDataSource: ProjectsDataSource;
    givenEventsDataSource: GivenEventsDataSource;
    dripListsDataSource: DripListsDataSource;
    receiversOfTypeAddressDataSource: ReceiversOfTypeAddressDataSource;
    receiversOfTypeProjectDataSource: ReceiversOfTypeProjectDataSource;
    receiversOfTypeDripListDataSource: ReceiversOfTypeDripListDataSource;
    projectAndDripListSupportDataSource: ProjectAndDripListSupportDataSource;
    usersDataSource: UsersDataSource;
    streamsDataSource: StreamsDataSource;
    totalEarnedDataSource: TotalEarnedDataSource;
  };
}

const app = express();
const httpServer = http.createServer(app);

const server = new ApolloServer<Context>({
  formatError: (formattedError, error: any) => {
    if (error instanceof BaseError) {
      console.error(formattedError.message);

      return { message: 'Internal server error' };
    }

    return formattedError;
  },
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
    res.status(200).send('OK');
  });

  app.use(
    '/',
    cors<cors.CorsRequest>(),
    bodyParser.json({ limit: '50mb' }),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const apiKey = req.headers.authorization?.split(' ')[1];

        if (
          !apiKey ||
          (!appSettings.publicApiKeys.includes(apiKey) &&
            apiKey !== appSettings.dripsApiKey)
        ) {
          console.log('Unauthorized');
          throw new Error('Unauthorized');
        }

        return {
          dataSources: {
            projectsDataSource: new ProjectsDataSource(),
            givenEventsDataSource: new GivenEventsDataSource(),
            dripListsDataSource: new DripListsDataSource(),
            receiversOfTypeAddressDataSource:
              new ReceiversOfTypeAddressDataSource(),
            receiversOfTypeProjectDataSource:
              new ReceiversOfTypeProjectDataSource(),
            receiversOfTypeDripListDataSource:
              new ReceiversOfTypeDripListDataSource(),
            projectAndDripListSupportDataSource:
              new ProjectAndDripListSupportDataSource(),
            givesDb: new GivenEventsDataSource(),
            usersDataSource: new UsersDataSource(),
            streamsDataSource: new StreamsDataSource(),
            totalEarnedDataSource: new TotalEarnedDataSource(),
          },
        };
      },
    }),
  );

  await new Promise<void>((resolve) =>
    // eslint-disable-next-line no-promise-executor-return
    httpServer.listen({ port: appSettings.port }, resolve),
  );

  console.log(`config: ${JSON.stringify(appSettings, null, 2)}`);
  console.log(`🚀 Server ready at http://localhost:${appSettings.port}/`);
};

export default startServer;
