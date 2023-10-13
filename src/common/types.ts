import type { FORGES_MAP, SUPPORTED_NETWORKS } from './constants';

export type KnownAny = any;
export type ValuesOf<T> = T[keyof T];
export type IpfsHash = string & { __brand: 'IpfsHash' };

export type AddressAccountId = string & {
  __brand: 'AddressAccountId';
};
export type DripListAccountId = string & { __brand: 'DripListAccountId' };
export type ProjectAccountId = string & { __brand: 'ProjectAccountId' };

export type AccountId = AddressAccountId | DripListAccountId | ProjectAccountId;

export type Forge = ValuesOf<typeof FORGES_MAP>;
export type DbSchema = SupportedNetwork & { __brand: 'dbSchema' };
export type SupportedNetwork = (typeof SUPPORTED_NETWORKS)[number];
