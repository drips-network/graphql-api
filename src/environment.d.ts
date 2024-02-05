import type { SupportedNetwork } from './common/types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      NETWORK: SupportedNetwork;
      API_KEYS: string;
      INFURA_API_KEY: string;
      POSTGRES_CONNECTION_STRING: string;
      ADDRESS_DRIVER_ADDRESS: string;
      RPC_URL: string;
      PRETEND_ALL_REPOS_EXIST: boolean;
      NODE_ENV: 'development' | 'production';
      IPFS_GATEWAY_URL: string;
    }
  }
}

export {};
