import gql from 'graphql-tag';

const estimatesTypeDef = gql`
  type StreamEstimate {
    id: ID!
    totalStreamed: String!
    currentAmountPerSecond: String!
    runsOutOfFunds: Date
    receiver: StreamReceiver
    sender: AddressDriverAccount
    tokenAddress: String!
  }

  type AssetConfigEstimates {
    total: AssetConfigEstimate
    currentCycle: AssetConfigEstimate
  }

  type AssetConfigEstimate {
    streams: [StreamEstimate!]!
    totals: AssetConfigTotals!
  }

  type AssetConfigTotals {
    totalStreamed: String!
    remainingBalance: String!
    totalAmountPerSecond: String!
  }

  type AccountEstimate {
    estimates: [TokenAssetConfigEstimates!]!
  }

  type TokenAssetConfigEstimates {
    tokenAddress: String!
    config: AssetConfigEstimates!
  }
`;

export default estimatesTypeDef;
