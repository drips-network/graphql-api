import gql from 'graphql-tag';

const linkedIdentityTypeDef = gql`
  enum LinkedIdentityType {
    ORCID
  }

  type LinkedIdentity {
    account: RepoDriverAccount!
    identityType: LinkedIdentityType!
    owner: AddressDriverAccount!
    isLinked: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }
`;

export default linkedIdentityTypeDef;
