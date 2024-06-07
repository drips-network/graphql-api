import gql from 'graphql-tag';

const projectTypeDef = gql`
  enum ProjectVerificationStatus {
    Claimed
    OwnerUpdateRequested
    OwnerUpdated
    Unclaimed
    PendingOwner
    PendingMetadata
  }

  type Splits {
    maintainers: [AddressReceiver!]!
    dependencies: [SplitsReceiver!]!
  }

  type EmojiAvatar {
    emoji: String!
  }

  type ImageAvatar {
    cid: String!
  }

  union Avatar = EmojiAvatar | ImageAvatar

  type Project {
    source: Source!
    account: RepoDriverAccount!
    chainData: [ProjectChainData!]!
  }

  union ProjectChainData = ClaimedProjectChainData | UnClaimedProjectChainData

  type ClaimedProjectChainData {
    chain: SupportedChain!
    data: ClaimedProjectData!
  }

  type ClaimedProjectData {
    color: String!
    emoji: String! @deprecated(reason: "Use avatar instead")
    avatar: Avatar!
    splits: Splits!
    description: String
    owner: AddressDriverAccount!
    verificationStatus: ProjectVerificationStatus!
    support: [SupportItem!]!
    claimedAt: Date!
    totalEarned: [Amount!]!
    withdrawableBalances: [WithdrawableBalance!]!
  }

  type UnClaimedProjectChainData {
    chain: SupportedChain!
    data: UnClaimedProjectData!
  }

  type UnClaimedProjectData {
    verificationStatus: ProjectVerificationStatus!
    support: [SupportItem!]!
    withdrawableBalances: [WithdrawableBalance!]!
  }

  input ProjectWhereInput {
    id: String
    url: String
    ownerAddress: String
    verificationStatus: ProjectVerificationStatus
  }

  input ProjectSortInput {
    field: ProjectSortField!
    direction: SortDirection
  }

  enum ProjectSortField {
    claimedAt
  }
`;

export default projectTypeDef;
