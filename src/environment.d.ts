import type { SupportedNetwork } from './common/types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      POSTGRES_USER: string;
      POSTGRES_PASSWORD: string;
      POSTGRES_DB: string;
      POSTGRES_HOST: string;
      POSTGRES_PORT: number;
      NETWORK: SupportedNetwork;
      PORT: number;
      infuraApiKey: string;
    }
  }
}

export {};
