import gql from 'graphql-tag';

const userTypeDef = gql`
  type HistoricalStream {
    streamId: ID!
    config: StreamConfig
    isManaged: Boolean!
    receiver: StreamReceiver!
    createdAt: Date!
  }

  type AssetConfigHistoryItem {
    timestamp: Date!
    balance: Amount!
    runsOutOfFunds: Date
    streams: [HistoricalStream!]!
    historyHash: String!
    receiversHash: String!
  }

  type AssetConfig {
    tokenAddress: String!
    streams: [Stream!]!
    history: [AssetConfigHistoryItem!]!
  }

  type UserAccount {
    user: AddressDriverAccount!
    name: String
    description: String
    emoji: String
    assetConfigs: [AssetConfig!]!
    lastUpdated: Date
    lastUpdatedByAddress: String
    lastIpfsHash: String
  }

  type UserStreams {
    incoming: [Stream!]!
    outgoing: [Stream!]!
  }

  type UserBalanceTimelineItem {
    timestamp: Date!
    currentAmount: Amount!
    deltaPerSecond: Amount!
  }

  type UserBalances {
    tokenAddress: String!
    incoming: [UserBalanceTimelineItem!]!
    outgoing: [UserBalanceTimelineItem!]!
  }

  type User {
    account: AddressDriverAccount!
    streams: UserStreams!
    projects: [Project]!
    dripLists: [DripList]!
    balances: [UserBalances!]!
  }
`;

export default userTypeDef;
