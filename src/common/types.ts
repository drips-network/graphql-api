import type { ProjectVerificationStatus } from '../generated/graphql';
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

export type Address = string & { __brand: 'Address' };

export type BigIntString = string & { __brand: 'BigIntString' };

export type Forge = ValuesOf<typeof FORGES_MAP>;
export type DbSchema = SupportedNetwork & { __brand: 'dbSchema' };
export type SupportedNetwork = (typeof SUPPORTED_NETWORKS)[number];

export enum DependencyType {
  ProjectDependency = 'ProjectDependency',
  DripListDependency = 'DripListDependency',
}

export type FakeUnclaimedProject = {
  id: ProjectId;
  name: string;
  forge: Forge;
  url: string;
  verificationStatus: ProjectVerificationStatus;
};

export interface IEventModel {
  logIndex: number;
  blockNumber: number;
  blockTimestamp: Date;
  transactionHash: string;
}
