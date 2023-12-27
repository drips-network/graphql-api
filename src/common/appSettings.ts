import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.ENV}` });

export default {
  port: (process.env.PORT || 8080) as number,
  network: process.env.NETWORK,
  environment: process.env.ENV ?? 'local',
  infuraApiKey: process.env.INFURA_API_KEY,
  apiKeys: process.env.API_KEYS?.split(',') || [],
  postgresConnectionString: process.env.POSTGRES_CONNECTION_STRING,
  rpcUrl:
    process.env.RPC_URL ??
    `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
  repoDriverAddress:
    process.env.REPO_DRIVER_ADDRESS ??
    '0x770023d55D09A9C110694827F1a6B32D5c2b373E',
  pretendAllReposExist:
    (process.env.PRETEND_ALL_REPOS_EXIST as unknown as string) === 'true',
  ipfsGatewayUrl: process.env.IPFS_GATEWAY_URL,
};
