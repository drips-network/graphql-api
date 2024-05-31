import gql from 'graphql-tag';

const dripListTypeDef = gql`
  type DripList {
    account: NftDriverAccount!
    chainData: [DripListChainData!]!
  }

  type DripListChainData {
    chain: SupportedChain!
    data: DripListData
  }

  type DripListData {
    name: String!
    creator: String!
    description: String
    splits: [SplitsReceiver!]!
    owner: AddressDriverAccount!
    previousOwnerAddress: String!
    support: [SupportItem!]!
    latestVotingRoundId: String
    totalEarned: [Amount!]!
  }

  input DripListWhereInput {
    id: String
    ownerAddress: String
  }

  type MintedTokens {
    chain: SupportedChain!
    total: Int!
  }
`;

export default dripListTypeDef;
