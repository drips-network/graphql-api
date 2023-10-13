import gql from 'graphql-tag';

const dripListTypeDef = gql`
  enum DripListSplitReceiver {
    DripListDependency
  }

  enum AddressDriver {
    AddressDriver
  }

  type DripListAddressDriverSplitReceiver {
    id: ID!
    weight: Int!
    driver: AddressDriver!
    fundeeAccountId: String!
    funderDripListId: String!
    type: DripListSplitReceiver!
  }

  enum RepoDriver {
    RepoDriver
  }

  type DripListRepoDriverSplitReceiver {
    id: ID!
    weight: Int!
    driver: RepoDriver!
    fundeeProject: Project
    funderDripListId: String!
    type: DripListSplitReceiver!
  }

  enum NftDriver {
    NftDriver
  }

  type DripListNftDriverSplitReceiver {
    id: ID!
    weight: Int!
    driver: NftDriver!
    fundeeDripList: DripList
    funderDripListId: String!
    type: DripListSplitReceiver!
  }

  type DripListSplits {
    ofTypeAddress: [DripListAddressDriverSplitReceiver!]
    ofTypeProject: [DripListRepoDriverSplitReceiver!]
    ofTypeDripList: [DripListNftDriverSplitReceiver!]
  }

  type DripList {
    id: ID!
    name: String
    isPublic: Boolean!
    ownerAddress: String!
    splits: DripListSplits
    previousOwnerAddress: String!
  }

  input DripListWhereInput {
    id: String
    ownerAddress: String
  }
`;

export default dripListTypeDef;
