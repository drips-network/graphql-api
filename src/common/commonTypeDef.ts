import gql from 'graphql-tag';

const commonTypeDef = gql`
  scalar Date

  enum Driver {
    ADDRESS
    REPO
    NFT
    IMMUTABLE_SPLITS
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

  type ImmutableSplitsDriverAccount implements Account {
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

  type EcosystemMainAccountReceiver implements Receiver {
    weight: Int!
    driver: Driver!
    ecosystemMainAccount: EcosystemMainAccount!
    account: NftDriverAccount!
  }

  type SubListReceiver implements Receiver {
    weight: Int!
    driver: Driver!
    subList: SubList!
    account: ImmutableSplitsDriverAccount!
  }

  union SplitsReceiver =
    | AddressReceiver
    | ProjectReceiver
    | DripListReceiver
    | SubListReceiver
    | EcosystemMainAccountReceiver

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
    totalSplit: [Amount!]!
  }

  type EcosystemSupport {
    account: NftDriverAccount!
    date: Date!
    weight: Int!
    ecosystemMainAccount: EcosystemMainAccount!
    totalSplit: [Amount!]!
  }

  type ProjectSupport {
    account: RepoDriverAccount!
    date: Date!
    weight: Int!
    project: Project!
    totalSplit: [Amount!]!
  }

  type OneTimeDonationSupport {
    account: AddressDriverAccount!
    amount: Amount!
    date: Date!
  }

  type StreamSupport {
    account: AddressDriverAccount!
    stream: Stream!
    date: Date!
  }

  type Amount {
    tokenAddress: String!
    amount: String!
  }

  type ChainAmount {
    tokenAddress: String!
    amount: String!
    chain: SupportedChain!
  }

  type SupportGroup {
    items: [Support!]
  }

  union SupportItem =
    | DripListSupport
    | ProjectSupport
    | OneTimeDonationSupport
    | StreamSupport
    | EcosystemSupport

  union Support =
    | DripListSupport
    | ProjectSupport
    | OneTimeDonationSupport
    | StreamSupport
    | EcosystemSupport

  enum SortDirection {
    ASC
    DESC
  }

  enum SupportedChain {
    MAINNET
    SEPOLIA
    OPTIMISM_SEPOLIA
    POLYGON_AMOY
    BASE_SEPOLIA
    FILECOIN
    METIS
    LOCALTESTNET
    OPTIMISM
  }

  type WithdrawableBalance {
    tokenAddress: String!
    splittableAmount: String!
    receivableAmount: String!
    collectableAmount: String!
  }
`;

export default commonTypeDef;
