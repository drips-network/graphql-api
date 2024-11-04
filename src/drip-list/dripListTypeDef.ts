import gql from 'graphql-tag';

const dripListTypeDef = gql`
  type DripList {
    account: NftDriverAccount!
    chain: SupportedChain!
    name: String!
    creator: String!
    description: String
    splits: [SplitsReceiver!]!
    owner: AddressDriverAccount!
    previousOwnerAddress: String!
    support: [SupportItem!]!
    latestVotingRoundId: String
    totalEarned: [Amount!]!
    latestMetadataIpfsHash: String
    isVisible: Boolean!
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
