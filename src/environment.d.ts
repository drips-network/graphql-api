import type { SupportedChain } from './common/types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      RPC_CONFIG: string;
      PUBLIC_API_KEYS: string;
      DRIPS_API_KEY: string;
      NODE_ENV: 'development' | 'production';
      ENV: 'local' | SupportedChain;
      POSTGRES_CONNECTION_STRING: string;
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
