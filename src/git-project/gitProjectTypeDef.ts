const gitProjectTypeDef = `#graphql
enum Forge {
  GitHub,
  GitLab,
}

enum ProjectVerificationStatus {
  Claimed,
  Started,
  Unclaimed,
  PendingOwner,
  PendingMetadata,
}

enum GitProjectSplitReceiverType {
  ProjectMaintainer,
  ProjectDependency,
}

enum AddressDriver {
  AddressDriver
}

type GitProjectAddressDriverSplitReceiver {
  id: ID!
  weight: Int!
  driver: AddressDriver!
  funderProjectId: String!
  fundeeAccountId: String!
  type: GitProjectSplitReceiverType!
}

enum RepoDriver {
  RepoDriver
}

type GitProjectRepoDriverSplitReceiver {
  id: ID!
  weight: Int!
  driver: RepoDriver!
  funderProjectId: String!
  fundeeProject: GitProject
  type: GitProjectSplitReceiverType!
}

type GitProjectDependenciesSplits  {
  ofTypeProject: [GitProjectRepoDriverSplitReceiver!]
  ofTypeAddress: [GitProjectAddressDriverSplitReceiver!]
}

type GitProjectSplits {
  dependencies: GitProjectDependenciesSplits
  maintainers: [GitProjectAddressDriverSplitReceiver!]
}

type GitProject {
  id: ID!
  url: String!
  forge: Forge!
  name: String!
  emoji: String!
  color: String!
  repoName: String!
  ownerName: String!
  description: String
  ownerAddress: String!
  ownerAccountId: String!
  splits: GitProjectSplits!
  updatedAt: String!
  verificationStatus: ProjectVerificationStatus!
}

input ProjectWhereInput {
  id: String
  url: String
  ownerAddress: String
  verificationStatus: ProjectVerificationStatus
}
`;

export default gitProjectTypeDef;
