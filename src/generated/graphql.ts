export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
};

export enum AccountType {
  AddressDriver = 'AddressDriver',
  NftDriver = 'NftDriver',
  RepoDriver = 'RepoDriver',
}

export type AddressAccount = {
  __typename?: 'AddressAccount';
  accountId: Scalars['ID']['output'];
  address: Scalars['String']['output'];
  driver: AccountType;
};

export enum AddressDriver {
  AddressDriver = 'AddressDriver',
}

export type AddressReceiver = {
  __typename?: 'AddressReceiver';
  account: AddressAccount;
  type: ReceiverType;
  weight: Scalars['Int']['output'];
};

export type ClaimedProject = {
  __typename?: 'ClaimedProject';
  color: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  emoji: Scalars['String']['output'];
  ownerAccount: AddressAccount;
  projectAccount: ProjectAccount;
  source: Source;
  splits: ProjectSplits;
  verificationStatus: ProjectVerificationStatus;
};

export type DripList = {
  __typename?: 'DripList';
  id: Scalars['ID']['output'];
  isPublic: Scalars['Boolean']['output'];
  name?: Maybe<Scalars['String']['output']>;
  ownerAddress: Scalars['String']['output'];
  previousOwnerAddress: Scalars['String']['output'];
  splits?: Maybe<DripListSplits>;
};

export type DripListAccount = {
  __typename?: 'DripListAccount';
  accountId: Scalars['ID']['output'];
  driver: AccountType;
};

export type DripListAddressDriverSplitReceiver = {
  __typename?: 'DripListAddressDriverSplitReceiver';
  driver: AddressDriver;
  fundeeAccountId: Scalars['String']['output'];
  funderDripListId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  type: DripListSplitReceiver;
  weight: Scalars['Int']['output'];
};

export type DripListNftDriverSplitReceiver = {
  __typename?: 'DripListNftDriverSplitReceiver';
  driver: NftDriver;
  fundeeDripList?: Maybe<DripList>;
  funderDripListId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  type: DripListSplitReceiver;
  weight: Scalars['Int']['output'];
};

export type DripListReceiver = {
  __typename?: 'DripListReceiver';
  account: DripListAccount;
  type: ReceiverType;
  weight: Scalars['Int']['output'];
};

export type DripListRepoDriverSplitReceiver = {
  __typename?: 'DripListRepoDriverSplitReceiver';
  driver: RepoDriver;
  fundeeProject?: Maybe<Project>;
  funderDripListId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  type: DripListSplitReceiver;
  weight: Scalars['Int']['output'];
};

export enum DripListSplitReceiver {
  DripListDependency = 'DripListDependency',
}

export type DripListSplits = {
  __typename?: 'DripListSplits';
  ofTypeAddress?: Maybe<Array<DripListAddressDriverSplitReceiver>>;
  ofTypeDripList?: Maybe<Array<DripListNftDriverSplitReceiver>>;
  ofTypeProject?: Maybe<Array<DripListRepoDriverSplitReceiver>>;
};

export type DripListWhereInput = {
  id?: InputMaybe<Scalars['String']['input']>;
  ownerAddress?: InputMaybe<Scalars['String']['input']>;
};

export enum Forge {
  GitHub = 'GitHub',
  GitLab = 'GitLab',
}

export enum NftDriver {
  NftDriver = 'NftDriver',
}

export type Project = ClaimedProject | UnclaimedProject;

export type ProjectAccount = {
  __typename?: 'ProjectAccount';
  accountId: Scalars['ID']['output'];
  driver: AccountType;
};

export type ProjectReceiver = {
  __typename?: 'ProjectReceiver';
  account: ProjectAccount;
  source: Source;
  type: ReceiverType;
  weight: Scalars['Int']['output'];
};

export type ProjectSplits = {
  __typename?: 'ProjectSplits';
  dependencies?: Maybe<Array<SplitsReceiver>>;
  maintainers?: Maybe<Array<AddressReceiver>>;
};

export enum ProjectVerificationStatus {
  Claimed = 'Claimed',
  OwnerUpdateRequested = 'OwnerUpdateRequested',
  OwnerUpdated = 'OwnerUpdated',
  PendingMetadata = 'PendingMetadata',
  PendingOwner = 'PendingOwner',
  Unclaimed = 'Unclaimed',
}

export type ProjectWhereInput = {
  id?: InputMaybe<Scalars['String']['input']>;
  ownerAddress?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  verificationStatus?: InputMaybe<ProjectVerificationStatus>;
};

export type Query = {
  __typename?: 'Query';
  dripList?: Maybe<DripList>;
  dripLists?: Maybe<Array<DripList>>;
  project?: Maybe<Project>;
  projects?: Maybe<Array<Project>>;
};

export type QueryDripListArgs = {
  id: Scalars['ID']['input'];
};

export type QueryDripListsArgs = {
  where?: InputMaybe<DripListWhereInput>;
};

export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};

export type QueryProjectsArgs = {
  where?: InputMaybe<ProjectWhereInput>;
};

export enum ReceiverType {
  Address = 'Address',
  DripList = 'DripList',
  Project = 'Project',
}

export enum RepoDriver {
  RepoDriver = 'RepoDriver',
}

export type Source = {
  __typename?: 'Source';
  forge: Forge;
  ownerName: Scalars['String']['output'];
  repoName: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type SplitsReceiver =
  | AddressReceiver
  | DripListReceiver
  | ProjectReceiver;

export type UnclaimedProject = {
  __typename?: 'UnclaimedProject';
  projectAccount: ProjectAccount;
  source: Source;
  verificationStatus: ProjectVerificationStatus;
};
