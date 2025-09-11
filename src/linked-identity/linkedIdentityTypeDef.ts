import gql from 'graphql-tag';

const linkedIdentityTypeDef = gql`
  type OrcidLinkedIdentity {
    chain: SupportedChain!
    account: RepoDriverAccount!
    owner: AddressDriverAccount
    isLinked: Boolean!
    isClaimed: Boolean!
    orcid: String!
  }

  union LinkedIdentity = OrcidLinkedIdentity

  enum LinkedIdentityTypeField {
    orcid
  }

  input LinkedIdentityWhereInput {
    type: LinkedIdentityTypeField
    accountId: String
    ownerAddress: String
    isLinked: Boolean
  }

  input LinkedIdentitySortInput {
    field: LinkedIdentitySortField!
    direction: SortDirection
  }

  enum LinkedIdentitySortField {
    createdAt
  }
`;

export default linkedIdentityTypeDef;
