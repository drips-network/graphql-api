import type { SupportedNetwork } from './common/types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      API_KEYS: string;
      INFURA_API_KEY: string;
      NETWORK: SupportedNetwork;
      POSTGRES_CONNECTION_STRING: string;
      RPC_URL: string | undefined;
      REPO_DRIVER_ADDRESS: string | undefined;
    }
  }
}

export {};
