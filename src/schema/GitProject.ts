const gitProjectTypeDef = `#graphql
enum Forge {
  GitHub,
  GitLab,
}

enum ProjectVerificationStatus {
  Unclaimed,
  OwnerUpdateRequested,
  OwnerUpdated,
  Claimed,
}

type AddressDriverSplitReceiver {
  id: ID!
  funderProjectId: String!
  weight: Int!
  accountId: String!
  type: String!
}

type RepoDriverSplitReceiver {
  id: ID!
  funderProjectId: String!
  weight: Int!
  accountId: String!
  project: GitProject!
}

union DependencySplitReceiver = AddressDriverSplitReceiver | RepoDriverSplitReceiver

type Splits {
  maintainers: [AddressDriverSplitReceiver!]
  dependencies: [DependencySplitReceiver!]
}


type GitProject {
  id: ID!
  name: String!
  forge: Forge!
  owner: String
  url: String
  emoji: String
  color: String
  ownerName: String
  description: String
  verificationStatus: ProjectVerificationStatus
  splits: Splits
}
`;

export default gitProjectTypeDef;
