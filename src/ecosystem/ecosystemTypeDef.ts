import gql from 'graphql-tag';

const ecosystemTypeDef = gql`
  union EcosystemSupportItem = OneTimeDonationSupport | StreamSupport

  type Ecosystem {
    account: NftDriverAccount!
    chain: SupportedChain!
    name: String!
    creator: String!
    description: String
    owner: AddressDriverAccount!
    previousOwnerAddress: String!
    support: [EcosystemSupportItem!]!
    totalEarned: [Amount!]!
    latestMetadataIpfsHash: String
    isVisible: Boolean!
    lastProcessedIpfsHash: String
  }
`;

export default ecosystemTypeDef;
