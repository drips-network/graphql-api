import startServer from './server';

// TODO: add pagination in all queries when data starts to grow.

process.on('uncaughtException', (error: Error) => {
  console.error('Fatal uncaughtException caught:', error);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('Fatal unhandledRejection caught:', reason);
});

startServer().catch((error: unknown) => {
  console.error('Server start failed:', error);
});
