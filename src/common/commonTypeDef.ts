import gql from 'graphql-tag';

const commonTypeDef = gql`
  scalar Date

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

  type DripListSupport {
    account: NftDriverAccount!
    date: Date!
    weight: Int!
    dripList: DripList!
  }

  type ProjectSupport {
    account: RepoDriverAccount!
    date: Date!
    weight: Int!
    project: Project!
  }

  type OneTimeDonationSupport {
    account: AddressDriverAccount!
    amount: Amount!
    date: Date!
  }

  type Amount {
    tokenAddress: String!
    amount: String!
  }

  type SupportGroup {
    items: [Support!]
  }

  union SupportItem =
      DripListSupport
    | ProjectSupport
    | OneTimeDonationSupport
    | SupportGroup

  union Support = DripListSupport | ProjectSupport | OneTimeDonationSupport

  enum SortDirection {
    ASC
    DESC
  }
`;

export default commonTypeDef;
