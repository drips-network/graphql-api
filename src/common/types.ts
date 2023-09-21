import type { FORGES_MAP, SUPPORTED_NETWORKS } from './constants';

export type KnownAny = any;
export type IpfsHash = string & { __brand: 'IpfsHash' };
export type AddressDriverAccountId = string & {
  __brand: 'AddressDriverAccountId';
};
export type NftDriverAccountId = string & { __brand: 'NftDriverAccountId' };
export type DripListId = NftDriverAccountId;
export type RepoDriverAccountId = string & { __brand: 'RepoDriverAccountId' };
export type ProjectId = RepoDriverAccountId;
export type AccountId =
  | AddressDriverAccountId
  | NftDriverAccountId
  | RepoDriverAccountId;

export type ValuesOf<T> = T[keyof T];

export type SupportedNetwork = (typeof SUPPORTED_NETWORKS)[number];

export type DbSchema = SupportedNetwork & { __brand: 'dbSchema' };

export type Forge = ValuesOf<typeof FORGES_MAP>;
