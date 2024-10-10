import dotenv from 'dotenv';
import type { SupportedChain } from '../generated/graphql';

dotenv.config();

type RpcConfig = {
  url: string;
  accessToken?: string;
  fallbackUrl?: string;
  fallbackAccessToken?: string;
};

export default {
  port: (process.env.PORT || 8080) as number,
  rpcConfigs: {
    MAINNET: {
      url: process.env.RPC_URL_MAINNET,
      accessToken: process.env.RPC_ACCESS_TOKEN_MAINNET,
      fallbackUrl: process.env.FALLBACK_RPC_URL_MAINNET,
      fallbackAccessToken: process.env.FALLBACK_RPC_ACCESS_TOKEN_MAINNET,
    },
    SEPOLIA: {
      url: process.env.RPC_URL_SEPOLIA,
      accessToken: process.env.RPC_ACCESS_TOKEN_SEPOLIA,
      fallbackUrl: process.env.FALLBACK_RPC_URL_SEPOLIA,
      fallbackAccessToken: process.env.FALLBACK_RPC_ACCESS_TOKEN_SEPOLIA,
    },
    OPTIMISM_SEPOLIA: {
      url: process.env.RPC_URL_OPTIMISM_SEPOLIA,
      accessToken: process.env.RPC_ACCESS_TOKEN_OPTIMISM_SEPOLIA,
      fallbackUrl: process.env.FALLBACK_RPC_URL_OPTIMISM_SEPOLIA,
      fallbackAccessToken:
        process.env.FALLBACK_RPC_ACCESS_TOKEN_OPTIMISM_SEPOLIA,
    },
    POLYGON_AMOY: {
      url: process.env.RPC_URL_POLYGON_AMOY,
      fallbackUrl: process.env.FALLBACK_RPC_URL_POLYGON_AMOY,
      accessToken: process.env.RPC_ACCESS_TOKEN_POLYGON_AMOY,
      fallbackAccessToken: process.env.FALLBACK_RPC_ACCESS_TOKEN_POLYGON_AMOY,
    },
    FILECOIN: {
      url: process.env.RPC_URL_FILECOIN,
      fallbackUrl: process.env.FALLBACK_RPC_URL_FILECOIN,
      accessToken: process.env.RPC_ACCESS_TOKEN_FILECOIN,
      fallbackAccessToken: process.env.FALLBACK_RPC_ACCESS_TOKEN_FILECOIN,
    },
  } as Record<SupportedChain, RpcConfig | undefined>,
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
