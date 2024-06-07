import gql from 'graphql-tag';

const userTypeDef = gql`
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
    chainData: [UserChainData!]!
  }

  type UserChainData {
    chain: SupportedChain!
    data: UserData
  }

  type UserData {
    streams: UserStreams!
    projects: [Project]!
    dripLists: [DripList]!
    balances: [UserBalances!]!
    support: [SupportItem!]!
    latestMetadataIpfsHash: String
    withdrawableBalances: [WithdrawableBalance!]!
  }
`;

export default userTypeDef;
