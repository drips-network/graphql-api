import type { SupportedNetwork } from './common/types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      NETWORK: SupportedNetwork;
      PUBLIC_API_KEYS: string;
      DRIPS_API_KEY: string;
      POSTGRES_CONNECTION_STRING: string;
      ADDRESS_DRIVER_ADDRESS: string;
      DRIPS_ADDRESS: string;
      REPO_DRIVER_ADDRESS: string | undefined;
      PRIMARY_RPC_URL: string;
      PRIMARY_RPC_ACCESS_TOKEN: string | undefined;
      FALLBACK_RPC_URL: string | undefined;
      FALLBACK_RPC_ACCESS_TOKEN: string | undefined;
      MAX_PRIMARY_PROVIDER_RETRY_DURATION: number | undefined;
      PRETEND_ALL_REPOS_EXIST: boolean;
      RATE_LIMIT_WINDOW_IN_MINUTES: string;
      RATE_LIMIT_MAX_REQUESTS_PER_WINDOW: string;
      MAX_QUERY_DEPTH: string;
      TIMEOUT_IN_SECONDS: string;
      IPFS_GATEWAY_URL: string;
    }
  }
}

export {};
