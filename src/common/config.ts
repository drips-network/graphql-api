import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.ENV}` });

export default {
  port: (process.env.PORT || 8080) as number,
  network: process.env.NETWORK,
  environment: process.env.ENV ?? 'local',
  infuraApiKey: process.env.INFURA_API_KEY,
  apiKeys: process.env.API_KEYS?.split(',') || [],
  postgresConnectionString: process.env.POSTGRES_CONNECTION_STRING,
  pretendAllReposExist: process.env.PRETEND_ALL_REPOS_EXIST === 'true',
};
