import type { FORGES_MAP, SUPPORTED_NETWORKS } from './constants';

export type KnownAny = any;
export type ValuesOf<T> = T[keyof T];
export type IpfsHash = string & { __brand: 'IpfsHash' };

export type AddressDriverId = string & {
  __brand: 'AddressDriverId';
};
export type DripListId = string & { __brand: 'DripListId' };
export type ProjectId = string & { __brand: 'ProjectId' };

export type AccountId = AddressDriverId | DripListId | ProjectId;

export type Forge = ValuesOf<typeof FORGES_MAP>;
export type DbSchema = SupportedNetwork & { __brand: 'dbSchema' };
export type SupportedNetwork = (typeof SUPPORTED_NETWORKS)[number];
