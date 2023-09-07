export type SupportedNetwork = 'mainnet' | 'sepolia' | 'goerli';
export type DbSchema = SupportedNetwork & { __brand: 'dbSchema' };
