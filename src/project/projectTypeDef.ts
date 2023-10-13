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

  type ProjectSplits {
    maintainers: [AddressReceiver!]
    dependencies: [SplitsReceiver!]
  }

  type ClaimedProject {
    source: Source!
    color: String!
    emoji: String!
    description: String
    splits: ProjectSplits!
    ownerAccount: AddressAccount!
    projectAccount: ProjectAccount!
    verificationStatus: ProjectVerificationStatus!
  }

  type UnclaimedProject {
    source: Source!
    projectAccount: ProjectAccount!
    verificationStatus: ProjectVerificationStatus!
  }

  input ProjectWhereInput {
    id: String
    url: String
    ownerAddress: String
    verificationStatus: ProjectVerificationStatus
  }

  union Project = ClaimedProject | UnclaimedProject
`;

export default projectTypeDef;
