export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Account = {
  accountId: Scalars['ID']['output'];
  driver: Driver;
};

export type AddressDriverAccount = Account & {
  __typename?: 'AddressDriverAccount';
  accountId: Scalars['ID']['output'];
  address: Scalars['String']['output'];
  driver: Driver;
};

export type AddressReceiver = Receiver & {
  __typename?: 'AddressReceiver';
  accountId: Scalars['ID']['output'];
  address: Scalars['String']['output'];
  driver: Driver;
  weight: Scalars['Int']['output'];
};

export type ClaimedProject = {
  __typename?: 'ClaimedProject';
  account: RepoDriverAccount;
  color: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  emoji: Scalars['String']['output'];
  owner: AddressDriverAccount;
  source: Source;
  splits: Splits;
  verificationStatus: ProjectVerificationStatus;
};

export type DripList = {
  __typename?: 'DripList';
  id: Scalars['ID']['output'];
  isPublic: Scalars['Boolean']['output'];
  name?: Maybe<Scalars['String']['output']>;
  owner: DripListOwner;
  previousOwnerAddress: Scalars['String']['output'];
  splits?: Maybe<Splits>;
};

export type DripListOwner = {
  __typename?: 'DripListOwner';
  accountId: Scalars['ID']['output'];
  address: Scalars['String']['output'];
  driver: Driver;
};

export type DripListReceiver = Receiver & {
  __typename?: 'DripListReceiver';
  dripList: DripList;
  driver: Driver;
  weight: Scalars['Int']['output'];
};

export type DripListWhereInput = {
  id?: InputMaybe<Scalars['String']['input']>;
  ownerAddress?: InputMaybe<Scalars['String']['input']>;
};

export enum Driver {
  ADDRESS = 'ADDRESS',
  NFT = 'NFT',
  REPO = 'REPO'
}

export enum Forge {
  GitHub = 'GitHub',
  GitLab = 'GitLab'
}

export type NftDriverAccount = Account & {
  __typename?: 'NftDriverAccount';
  accountId: Scalars['ID']['output'];
  driver: Driver;
  owner: AddressDriverAccount;
};

export type Project = ClaimedProject | UnclaimedProject;

export type ProjectReceiver = Receiver & {
  __typename?: 'ProjectReceiver';
  driver: Driver;
  project: Project;
  weight: Scalars['Int']['output'];
};

export enum ProjectVerificationStatus {
  Claimed = 'Claimed',
  OwnerUpdateRequested = 'OwnerUpdateRequested',
  OwnerUpdated = 'OwnerUpdated',
  PendingMetadata = 'PendingMetadata',
  PendingOwner = 'PendingOwner',
  Unclaimed = 'Unclaimed'
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
  projectByUrl?: Maybe<Project>;
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


export type QueryProjectByUrlArgs = {
  url: Scalars['String']['input'];
};


export type QueryProjectsArgs = {
  where?: InputMaybe<ProjectWhereInput>;
};

export type Receiver = {
  driver: Driver;
  weight: Scalars['Int']['output'];
};

export type RepoDriverAccount = Account & {
  __typename?: 'RepoDriverAccount';
  accountId: Scalars['ID']['output'];
  driver: Driver;
};

export type Source = {
  __typename?: 'Source';
  forge: Forge;
  ownerName: Scalars['String']['output'];
  repoName: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type Splits = {
  __typename?: 'Splits';
  dependencies: Array<SplitsReceiver>;
  maintainers: Array<AddressReceiver>;
};

export type SplitsReceiver = AddressReceiver | DripListReceiver | ProjectReceiver;

export type UnclaimedProject = {
  __typename?: 'UnclaimedProject';
  account: RepoDriverAccount;
  source: Source;
  verificationStatus: ProjectVerificationStatus;
};
