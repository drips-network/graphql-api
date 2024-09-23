import appSettings from './common/appSettings';
import createProvider from './common/createProvider';
import FailoverProvider from './common/FailoverProvider';
import startServer from './server';
import shouldNeverHappen from './utils/shouldNeverHappen';

// TODO: add pagination in all queries when data starts to grow.
(async () => {
  await initFailoverProvider();
  await startServer();
})();

async function initFailoverProvider() {
  const {
    primaryRpcUrl,
    primaryRpcAccessToken,
    fallbackRpcUrl,
    fallbackRpcAccessToken,
    maxPrimaryProviderRetryDuration,
  } = appSettings;

  await FailoverProvider.init({
    primaryProvider: {
      provider:
        (await createProvider(
          primaryRpcUrl,
          undefined,
          primaryRpcAccessToken,
        )) ?? shouldNeverHappen(),
      healthCheckTimeout: 5000,
      retryOptions: {
        maxRetries: Infinity, // Retry indefinitely.
        baseBackoffDelay: 30000, // Start with a 30 second delay.
        maxBackoffDelay: 600000, // Cap the delay at 10 minutes.
        maxRetryDuration: maxPrimaryProviderRetryDuration,
      },
      name: primaryRpcUrl,
    },
    fallbackProviders: fallbackRpcUrl
      ? [
          {
            provider:
              (await createProvider(
                fallbackRpcUrl,
                undefined,
                fallbackRpcAccessToken,
              )) ?? shouldNeverHappen(),
            healthCheckTimeout: 5000,
            name: fallbackRpcUrl,
          },
        ]
      : undefined,
    // TODO: add logger: https://github.com/drips-network/graphql-api/issues/26
    logger: console,
    pingInterval: 30 * 60 * 1000, // 30 minutes
  });
}

process.on('uncaughtException', async (error: Error) => {
  // TODO: remove this after making sure `FailoverProvider` did its job on production.
  if (
    error.message
      ?.toLowerCase()
      .includes('503 Service Unavailable'.toLowerCase())
  ) {
    console.warn('This should have been caught by the `FailoverProvider`.');

    await FailoverProvider.destroy();
    await initFailoverProvider();

    return;
  }

  console.error(`Uncaught Exception: ${error.message} \n${error.stack}`);

  // Railway will restart the process if it exits with a non-zero exit code.
  process.exit(1);
});
