import gql from 'graphql-tag';

const subListTypeDef = gql`
  type SubList {
    account: ImmutableSplitsDriverAccount!
    chain: SupportedChain!
    parentAccountId: String!
    parentAccountType: String!
    rootAccountId: String!
    rootAccountType: String!
    latestMetadataIpfsHash: String
    lastProcessedIpfsHash: String
  }
`;

export default subListTypeDef;
