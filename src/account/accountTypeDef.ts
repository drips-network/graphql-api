import gql from 'graphql-tag';

const accountTypeDef = gql`
  type StreamConfig {
    raw: String!
    dripId: String!
    amountPerSecond: Amount!
    startDate: Date
    durationSeconds: Int
  }

  union StreamReceiver = AddressDriverAccount | NftDriverAccount

  type HistoricalStream {
    streamId: ID!
    config: StreamConfig
    isManaged: Boolean!
    receiver: StreamReceiver!
  }

  type AssetConfigHistoryItem {
    timestamp: Date!
    balance: Amount!
    runsOutOfFunds: Date
    streams: [HistoricalStream!]!
    historyHash: String!
    receiversHash: String!
  }

  type Stream {
    id: ID!
    sender: AddressDriverAccount!
    receiver: StreamReceiver!
    config: StreamConfig!
    isPaused: Boolean!
    name: String
    description: String
    isArchived: Boolean
    isManaged: Boolean!
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
`;

export default accountTypeDef;
