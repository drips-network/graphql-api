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

  type AddressDriverAccount {
    accountId: ID!
    driver: Driver!
    address: String!
  }

  type ClaimedProject {
    source: Source!
    color: String!
    emoji: String!
    splits: Splits!
    description: String
    owner: AddressDriverAccount!
    account: RepoDriverAccount!
    verificationStatus: ProjectVerificationStatus!
  }

  type UnclaimedProject {
    source: Source!
    account: RepoDriverAccount!
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
