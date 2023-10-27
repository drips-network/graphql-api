import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

export default {
  network: process.env.NETWORK,
  postgresHost: process.env.POSTGRES_HOST,
  postgresPort: process.env.POSTGRES_PORT as unknown as number,
  postgresDatabase: process.env.POSTGRES_DB,
  postgresUsername: process.env.POSTGRES_USER,
  postgresPassword: process.env.POSTGRES_PASSWORD,
  port: process.env.PORT as unknown as number,
  infuraApiKey: process.env.INFURA_API_KEY,
};
