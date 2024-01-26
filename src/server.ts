/* eslint-disable no-console */
import { ApolloServer } from '@apollo/server';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
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
import resolvers from './resolvers';
import typeDefs from './schema';
import appSettings from './common/appSettings';
import ProjectsDataSource from './dataLoaders/ProjectsDataSource';
import connectToDatabase from './database/connectToDatabase';
import ReceiversOfTypeProjectDataSource from './dataLoaders/ReceiversOfTypeProjectDataSource';
import ReceiversOfTypeAddressDataSource from './dataLoaders/ReceiversOfTypeAddressDataSource';
import DripListsDataSource from './dataLoaders/DripListsDataSource';
import ReceiversOfTypeDripListDataSource from './dataLoaders/ReceiversOfTypeDripListDataSource';
import GivenEventsDataSource from './dataLoaders/GivenEventsDataSource';
import ProjectAndDripListSupportDataSource from './dataLoaders/ProjectAndDripListSupportDataSource';

export interface Context {
  dataSources: {
    projectsDb: ProjectsDataSource;
    givenEventsDb: GivenEventsDataSource;
    dripListsDb: DripListsDataSource;
    receiversOfTypeAddressDb: ReceiversOfTypeAddressDataSource;
    receiversOfTypeProjectDb: ReceiversOfTypeProjectDataSource;
    receiversOfTypeDripListDb: ReceiversOfTypeDripListDataSource;
    projectAndDripListSupportDb: ProjectAndDripListSupportDataSource;
    givesDb: GivenEventsDataSource;
  };
}

const app = express();
const httpServer = http.createServer(app);

const server = new ApolloServer<Context>({
  introspection: true,
  validationRules: [depthLimit(appSettings.maxQueryDepth)],
  typeDefs,
  resolvers,
  plugins: [
    appSettings.environment === 'mainnet'
      ? ApolloServerPluginLandingPageProductionDefault()
      : ApolloServerPluginLandingPageLocalDefault(),
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
            projectsDb: new ProjectsDataSource(),
            givenEventsDb: new GivenEventsDataSource(),
            dripListsDb: new DripListsDataSource(),
            receiversOfTypeAddressDb: new ReceiversOfTypeAddressDataSource(),
            receiversOfTypeProjectDb: new ReceiversOfTypeProjectDataSource(),
            receiversOfTypeDripListDb: new ReceiversOfTypeDripListDataSource(),
            projectAndDripListSupportDb:
              new ProjectAndDripListSupportDataSource(),
            givesDb: new GivenEventsDataSource(),
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
