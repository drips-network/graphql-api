import type { SupportedNetwork } from './common/types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      API_KEYS: string;
      INFURA_API_KEY: string;
      NETWORK: SupportedNetwork;
      ENV: 'local' | SupportedNetwork;
      POSTGRES_CONNECTION_STRING: string;
      PRETEND_ALL_REPOS_EXIST: boolean;
    }
  }
}

export {};
