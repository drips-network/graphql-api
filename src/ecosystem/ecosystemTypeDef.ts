import gql from 'graphql-tag';

const ecosystemTypeDef = gql`
  union EcosystemSupportItem = OneTimeDonationSupport | StreamSupport

  type EcosystemMainAccount {
    account: NftDriverAccount!
    chain: SupportedChain!
    name: String!
    creator: String!
    description: String
    owner: AddressDriverAccount!
    previousOwnerAddress: String!
    support: [EcosystemSupportItem!]!
    splits: [SplitsReceiver!]!
    totalEarned: [Amount!]!
    latestMetadataIpfsHash: String
    isVisible: Boolean!
    lastProcessedIpfsHash: String
    avatar: Avatar!
    color: String!
  }
`;

export default ecosystemTypeDef;
