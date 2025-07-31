import gql from 'graphql-tag';

const projectTypeDef = gql`
  enum ProjectVerificationStatus {
    Claimed
    Unclaimed
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
    chainData: [ProjectData!]!
    isVisible: Boolean!
  }

  union ProjectData = ClaimedProjectData | UnClaimedProjectData

  type ClaimedProjectData {
    chain: SupportedChain!
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
    withdrawableSubAccountBalances: [WithdrawableBalance!]!
    latestMetadataIpfsHash: String!
    lastProcessedIpfsHash: String
  }

  type UnClaimedProjectData {
    chain: SupportedChain!
    verificationStatus: ProjectVerificationStatus!
    support: [SupportItem!]!
    withdrawableBalances: [WithdrawableBalance!]!
    withdrawableSubAccountBalances: [WithdrawableBalance!]!
    owner: AddressDriverAccount!
  }

  input ProjectWhereInput {
    accountId: String
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
