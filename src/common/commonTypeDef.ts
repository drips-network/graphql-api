import gql from 'graphql-tag';

const commonTypeDef = gql`
  enum Driver {
    ADDRESS
    REPO
    NFT
  }

  interface Account {
    driver: Driver!
    accountId: ID!
  }

  type AddressDriverAccount implements Account {
    driver: Driver!
    accountId: ID!
    address: String!
  }

  type RepoDriverAccount implements Account {
    driver: Driver!
    accountId: ID!
  }

  type NftDriverAccount implements Account {
    driver: Driver!
    accountId: ID!
  }

  interface Receiver {
    weight: Int!
    driver: Driver!
  }

  type AddressReceiver implements Receiver {
    weight: Int!
    driver: Driver!
    address: String!
    accountId: ID!
  }

  type ProjectReceiver implements Receiver {
    weight: Int!
    driver: Driver!
    project: Project!
  }

  type DripListReceiver implements Receiver {
    weight: Int!
    driver: Driver!
    dripList: DripList!
  }

  type Splits {
    maintainers: [AddressReceiver!]!
    dependencies: [SplitsReceiver!]!
  }

  union SplitsReceiver = AddressReceiver | ProjectReceiver | DripListReceiver

  enum Forge {
    GitHub
    GitLab
  }

  type Source {
    forge: Forge!
    url: String!
    repoName: String!
    ownerName: String!
  }
`;

export default commonTypeDef;
