import dotenv from 'dotenv';
import type { SupportedChain } from '../generated/graphql';

dotenv.config({ path: `.env.${process.env.ENV}` });

export default {
  port: (process.env.PORT || 8080) as number,
  rpcUrls: {
    MAINNET: process.env.RPC_URL_MAINNET,
    SEPOLIA: process.env.RPC_URL_SEPOLIA,
    OPTIMISM_SEPOLIA: process.env.RPC_URL_OPTIMISM_SEPOLIA,
    POLYGON_AMOY: process.env.RPC_URL_POLYGON_AMOY,
  } as Record<SupportedChain, string | undefined>,
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
