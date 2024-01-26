import type { SupportedNetwork } from './common/types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      PUBLIC_API_KEYS: string;
      DRIPS_API_KEY: string;
      INFURA_API_KEY: string;
      NETWORK: SupportedNetwork;
      ENV: 'local' | SupportedNetwork;
      POSTGRES_CONNECTION_STRING: string;
      RPC_URL: string | undefined;
      REPO_DRIVER_ADDRESS: string | undefined;
      PRETEND_ALL_REPOS_EXIST: boolean;
      RATE_LIMIT_WINDOW_IN_MINUTES: string;
      RATE_LIMIT_MAX_REQUESTS_PER_WINDOW: string;
      MAX_QUERY_DEPTH: string;
      TIMEOUT_IN_SECONDS: string;
    }
  }
}

export {};
