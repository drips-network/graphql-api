import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

export default {
  port: (process.env.PORT || 8080) as number,
  network: process.env.NETWORK,
  infuraApiKey: process.env.INFURA_API_KEY,
  apiKeys: process.env.API_KEYS?.split(',') || [],
  postgresConnectionString: process.env.POSTGRES_CONNECTION_STRING,
};
