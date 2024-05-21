import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.ENV}` });

export default {
  port: (process.env.PORT || 8080) as number,
  rpcUrls: {
    mainnet: process.env.RPC_URL_MAINNET,
    sepolia: process.env.RPC_URL_SEPOLIA,
    optimism_sepolia: process.env.RPC_URL_OPTIMISM_SEPOLIA,
    polygon_amoy: process.env.RPC_URL_POLYGON_AMOY,
  },
  publicApiKeys: process.env.PUBLIC_API_KEYS?.split(',') || [],
  dripsApiKey: process.env.DRIPS_API_KEY,
  postgresConnectionString: process.env.POSTGRES_CONNECTION_STRING,
  pretendAllReposExist:
    (process.env.PRETEND_ALL_REPOS_EXIST as unknown as string) === 'true' ||
    false,
  rateLimitWindowInMinutes: parseInt(
    process.env.RATE_LIMIT_WINDOW_IN_MINUTES ?? '2',
    10,
  ),
  rateLimitMaxRequestsPerWindow: parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS_PER_WINDOW ?? '1000',
    10,
  ),
  maxQueryDepth: parseInt(process.env.MAX_QUERY_DEPTH ?? '10', 10),
  timeoutInSeconds: parseInt(process.env.TIMEOUT_IN_SECONDS ?? '20', 10),
  ipfsGatewayUrl:
    process.env.IPFS_GATEWAY_URL || 'https://drips.mypinata.cloud',
};
