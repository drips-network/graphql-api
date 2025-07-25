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
    lastProcessedIpfsHash: String
  }

  input DripListWhereInput {
    id: String
    ownerAddress: String
  }

  input DripListSortInput {
    field: DripListSortField!
    direction: SortDirection
  }

  enum DripListSortField {
    mintedAt
  }

  type MintedTokens {
    chain: SupportedChain!
    total: Int!
  }
`;

export default dripListTypeDef;
