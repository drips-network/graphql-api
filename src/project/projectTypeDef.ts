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

  type ClaimedProject {
    source: Source!
    color: String!
    emoji: String! @deprecated(reason: "Use avatar instead")
    avatar: Avatar!
    splits: Splits!
    description: String
    owner: AddressDriverAccount!
    account: RepoDriverAccount!
    verificationStatus: ProjectVerificationStatus!
    support: [SupportItem!]!
    claimedAt: Date!
  }

  type UnclaimedProject {
    source: Source!
    account: RepoDriverAccount!
    verificationStatus: ProjectVerificationStatus!
    support: [SupportItem!]!
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

  union Project = ClaimedProject | UnclaimedProject
`;

export default projectTypeDef;
