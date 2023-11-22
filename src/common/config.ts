import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

export default {
  port: (process.env.PORT || 8080) as number,
  network: process.env.NETWORK,
  infuraApiKey: process.env.INFURA_API_KEY,
  apiKeys: process.env.API_KEYS?.split(',') || [],
  postgresConnectionString: process.env.POSTGRES_CONNECTION_STRING,
  rpcUrl:
    process.env.RPC_URL ??
    `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
  repoDriverAddress:
    process.env.REPO_DRIVER_ADDRESS ??
    '0x770023d55D09A9C110694827F1a6B32D5c2b373E',
};
