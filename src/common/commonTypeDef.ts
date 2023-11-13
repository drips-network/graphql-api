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
    account: Account!
  }

  type AddressReceiver implements Receiver {
    weight: Int!
    driver: Driver!
    account: AddressDriverAccount!
  }

  type ProjectReceiver implements Receiver {
    weight: Int!
    driver: Driver!
    project: Project!
    account: RepoDriverAccount!
  }

  type DripListReceiver implements Receiver {
    weight: Int!
    driver: Driver!
    dripList: DripList!
    account: NftDriverAccount!
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
