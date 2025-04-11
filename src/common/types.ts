import type { AnyVersion } from '@efstajas/versioned-parser';
import type {
  ClaimedProjectData,
  DripList,
  EcosystemMainAccount,
  Give,
  Project,
  UnClaimedProjectData,
  User,
  UserData,
} from '../generated/graphql';
import type StreamReceiverSeenEventModel from '../models/StreamReceiverSeenEventModel';
import type { DB_SCHEMAS, FORGES_MAP } from './constants';
import type { addressDriverAccountMetadataParser } from '../schemas';
import type StreamsSetEventModel from '../models/StreamsSetEventModel';
import type { GivenEventModelDataValues } from '../given-event/GivenEventModel';

export type KnownAny = any;
export type ValuesOf<T> = T[keyof T];
export type IpfsHash = string & { __brand: 'IpfsHash' };

export type AddressDriverId = string & {
  __brand: 'AddressDriverId';
};
export type NftDriverId = string & { __brand: 'NftDriverId' };
export type RepoDriverId = string & { __brand: 'RepoDriverId' };

export type AccountId = AddressDriverId | NftDriverId | RepoDriverId;

export type Address = string & { __brand: 'Address' };

export type BigIntString = string & { __brand: 'BigIntString' };

export type Forge = ValuesOf<typeof FORGES_MAP>;

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
  chainData: (ResolverClaimedProjectData | ResolverUnClaimedProjectData)[];
};

type ProjectDataParentProjectInfo = {
  parentProjectInfo: {
    projectId: RepoDriverId;
    projectChain: DbSchema;
    queriedChains: DbSchema[];
  };
};

export type ResolverClaimedProjectData = ClaimedProjectData &
  ProjectDataParentProjectInfo;

export type ResolverUnClaimedProjectData = UnClaimedProjectData &
  ProjectDataParentProjectInfo;

export interface MultiChainKey<T = AccountId> {
  id: T;
  chains: DbSchema[];
}
export type RepoDriverMultiChainKey = MultiChainKey<RepoDriverId>;
export type NftDriverMultiChainKey = MultiChainKey<NftDriverId>;

export type ResolverDripList = DripList & {
  chainData?: ResolverDripListData[];
};

type DripListDataParentDripListInfo = {
  parentDripListInfo: {
    dripListId: NftDriverId;
    dripListChain: DbSchema;
    queriedChain: DbSchema;
  };
};

export type ResolverDripListData = DripList & DripListDataParentDripListInfo;

export type ResolverEcosystem = EcosystemMainAccount & {
  chainData?: ResolverEcosystemData[];
};

type EcosystemDataParentEcosystemInfo = {
  parentEcosystemInfo: {
    ecosystemId: NftDriverId;
    ecosystemChain: DbSchema;
    queriedChains: DbSchema[];
  };
};

export type ResolverEcosystemData = EcosystemMainAccount &
  EcosystemDataParentEcosystemInfo;

export type CommonDataValues = {
  createdAt: Date;
  updatedAt: Date;
  chain: DbSchema;
};

export type ResolverGive = Give & {
  chainData: ResolverGiveChainData[];
};

export type ResolverGiveChainData = {
  chain: DbSchema;
  data: GivenEventModelDataValues | null;
};

export type ResolverUser = User & {
  chainData: ResolverUserData[];
};

export type ResolverUserData = UserData & UserDataParentDripListInfo;

export type UserDataParentDripListInfo = {
  parentUserInfo: {
    accountId: AccountId;
    userChain: DbSchema;
    queriedChains: DbSchema[];
  };
};

export type DbSchema = (typeof DB_SCHEMAS)[number];
