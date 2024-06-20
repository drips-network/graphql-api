import type { DbSchema } from '../common/types';
import { SupportedChain } from '../generated/graphql';

export const dbSchemaToChain: Record<DbSchema, SupportedChain> = {
  mainnet: SupportedChain.MAINNET,
  sepolia: SupportedChain.SEPOLIA,
  optimism_sepolia: SupportedChain.OPTIMISM_SEPOLIA,
  polygon_amoy: SupportedChain.POLYGON_AMOY,
};

export const chainToDbSchema: Record<SupportedChain, DbSchema> = {
  [SupportedChain.MAINNET]: 'mainnet',
  [SupportedChain.SEPOLIA]: 'sepolia',
  [SupportedChain.OPTIMISM_SEPOLIA]: 'optimism_sepolia',
  [SupportedChain.POLYGON_AMOY]: 'polygon_amoy',
};
