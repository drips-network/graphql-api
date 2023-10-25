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

  type ProjectOwner {
    accountId: ID!
    driver: Driver!
    address: String!
  }

  type ProjectAccount {
    driver: Driver!
    accountId: ID!
  }

  type ClaimedProject {
    source: Source!
    color: String!
    emoji: String!
    splits: Splits
    description: String
    owner: ProjectOwner!
    account: ProjectAccount!
    verificationStatus: ProjectVerificationStatus!
  }

  type UnclaimedProject {
    source: Source!
    account: ProjectAccount!
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
