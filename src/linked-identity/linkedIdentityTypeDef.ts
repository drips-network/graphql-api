import gql from 'graphql-tag';

const linkedIdentityTypeDef = gql`
  type OrcidLinkedIdentity {
    chain: SupportedChain!
    account: RepoDriverAccount!
    owner: AddressDriverAccount
    areSplitsValid: Boolean!
    isClaimed: Boolean!
    orcid: String!
    orcidMetadata: OrcidMetadata
    support: [SupportItem!]!
    totalEarned: [Amount!]!
    withdrawableBalances: [WithdrawableBalance!]!
  }

  type OrcidMetadata {
    givenName: String
    familyName: String
  }

  union LinkedIdentity = OrcidLinkedIdentity

  enum LinkedIdentityTypeField {
    orcid
  }

  input LinkedIdentityWhereInput {
    type: LinkedIdentityTypeField
    accountId: String
    ownerAddress: String
    areSplitsValid: Boolean
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
