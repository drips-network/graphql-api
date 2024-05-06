import type { AnyVersion } from '@efstajas/versioned-parser';
import type { ProjectVerificationStatus } from '../generated/graphql';
import { Chain } from '../generated/graphql';
import type StreamReceiverSeenEventModel from '../models/StreamReceiverSeenEventModel';
import type { FORGES_MAP, SUPPORTED_CHAINS } from './constants';
import type { addressDriverAccountMetadataParser } from '../schemas';
import type StreamsSetEventModel from '../models/StreamsSetEventModel';

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
export type DbSchema = SupportedChain & { __brand: 'dbSchema' };
export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

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
  chain: SupportedChain;
};

export interface IEventModel {
  logIndex: number;
  blockNumber: number;
  blockTimestamp: Date;
  transactionHash: string;
}

export type StreamsSetEventWithReceivers = Pick<
  StreamsSetEventModel,
  | 'accountId'
  | 'erc20'
  | 'receiversHash'
  | 'streamsHistoryHash'
  | 'balance'
  | 'maxEnd'
  | 'blockTimestamp'
> & {
  receivers: Pick<
    StreamReceiverSeenEventModel,
    'receiversHash' | 'accountId' | 'config'
  >[];
};

export type AccountMetadata = AnyVersion<
  typeof addressDriverAccountMetadataParser
>;
export type AssetConfigMetadata = AccountMetadata['assetConfigs'][number];

export type StreamHistoryHashes = string & {
  __type: 'StreamHistoryHashes';
};

export const chainToDbSchemaMap: Record<Chain, SupportedChain> = {
  MAINNET: 'mainnet',
  SEPOLIA: 'sepolia',
  OPTIMISM_SEPOLIA: 'optimism-sepolia',
  POLYGON_AMOY: 'polygon-amoy',
};

export const dbSchemaToChainMap: Record<SupportedChain, Chain> = {
  mainnet: Chain.MAINNET,
  sepolia: Chain.SEPOLIA,
  'optimism-sepolia': Chain.OPTIMISM_SEPOLIA,
  'polygon-amoy': Chain.POLYGON_AMOY,
} as const;
