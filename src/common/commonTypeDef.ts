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

  type MovingAmount {
    # From this timestamp on…
    timestamp: Date!
    # ... take this amount ...
    amount: Amount!
    # ... and add this amount per second
    amountPerSecond: Amount!
  }

  type Balance {
    tokenAddress: string;
    incoming: [MovingAmount!]!
    outgoing: [MovingAmount!]!
  }

  type AddressDriverAccount implements Account {
    driver: Driver!
    accountId: ID!
    address: String!
    balances: [Balance!]!
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
    total: [MovingBalance!]!
  }

  type ProjectSupport {
    account: RepoDriverAccount!
    date: Date!
    weight: Int!
    project: Project!
    total: [MovingBalance!]!
  }

  type OneTimeDonationSupport {
    account: AddressDriverAccount!
    date: Date!
    total: [MovingBalance!]!
  }

  type StreamSupport {
    account: AddressDriverAccount!
    date: Date!
    total: [MovingBalance!]!
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
    | StreamSupport

  union Support = DripListSupport | ProjectSupport | OneTimeDonationSupport | StreamSupport
`;

export default commonTypeDef;
