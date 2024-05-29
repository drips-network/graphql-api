import type { AnyVersion } from '@efstajas/versioned-parser';
import type {
  ClaimedProjectData,
  DripList,
  DripListData,
  Project,
  SupportedChain,
  UnClaimedProjectData,
} from '../generated/graphql';
import type StreamReceiverSeenEventModel from '../models/StreamReceiverSeenEventModel';
import type { FORGES_MAP } from './constants';
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
export type DbSchema = SupportedChain;

export enum DependencyType {
  ProjectDependency = 'ProjectDependency',
  DripListDependency = 'DripListDependency',
}

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

export type ResolverProject = Project & {
  chainData: (
    | ResolverClaimedProjectChainData
    | ResolverUnClaimedProjectChainData
  )[];
};

type ProjectDataParentProjectInfo = {
  parentProjectInfo: {
    projectId: ProjectId;
    projectChain: SupportedChain;
    queriedChains: SupportedChain[];
  };
};

export type ResolverClaimedProjectData = ClaimedProjectData &
  ProjectDataParentProjectInfo;

export type ResolverClaimedProjectChainData = {
  chain: SupportedChain;
  data: ResolverClaimedProjectData;
};

export type ResolverUnClaimedProjectData = UnClaimedProjectData &
  ProjectDataParentProjectInfo;

export type ResolverUnClaimedProjectChainData = {
  chain: SupportedChain;
  data: ResolverUnClaimedProjectData;
};

export interface DripListMultiChainKey {
  dripListId: DripListId;
  chains: SupportedChain[];
}

export interface StreamMultiChainKey {
  accountId: AccountId;
  chains: SupportedChain[];
}

export interface ProjectMultiChainKey {
  projectId: ProjectId;
  chains: SupportedChain[];
}

export type ResolverDripList = DripList & {
  chainData: ResolverDripListChainData[];
};

export type ResolverDripListChainData = {
  chain: SupportedChain;
  data: ResolverDripListData | null;
};

type DripListDataParentDripListInfo = {
  parentDripListInfo: {
    dripListId: DripListId;
    dripListChain: SupportedChain;
    queriedChains: SupportedChain[];
  };
};

export type ResolverDripListData = DripListData &
  DripListDataParentDripListInfo;

export type CommonDataValues = {
  createdAt: Date;
  updatedAt: Date;
  chain: SupportedChain;
};
