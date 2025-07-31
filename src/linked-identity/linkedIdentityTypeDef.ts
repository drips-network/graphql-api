import gql from 'graphql-tag';

const linkedIdentityTypeDef = gql`
  enum LinkedIdentityType {
    ORCID
  }

  type LinkedIdentity {
    account: RepoDriverAccount!
    chainData: [LinkedIdentityData!]!
  }

  type LinkedIdentityData {
    chain: SupportedChain!
    identityType: LinkedIdentityType!
    owner: AddressDriverAccount!
    createdAt: Date!
    updatedAt: Date!
  }

  extend type Query {
    linkedIdentitiesByOwner(
      ownerAddress: String!
      chains: [SupportedChain!]
    ): [LinkedIdentity!]!
  }
`;

export default linkedIdentityTypeDef;
