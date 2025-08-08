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
    chainData: [UserData!]!
  }

  type UserData {
    chain: SupportedChain!
    streams: UserStreams!
    projects: [Project]!
    dripLists: [DripList]!
    linkedIdentities: [LinkedIdentity!]!
    balances: [UserBalances!]!
    support: [SupportItem!]!
    latestMetadataIpfsHash: String
    withdrawableBalances: [WithdrawableBalance!]!
  }
`;

export default userTypeDef;
