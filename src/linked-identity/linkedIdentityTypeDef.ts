import gql from 'graphql-tag';

const linkedIdentityTypeDef = gql`
  type OrcidLinkedIdentity {
    account: RepoDriverAccount!
    owner: AddressDriverAccount
    isLinked: Boolean!
    createdAt: Date!
    updatedAt: Date!
    orcid: String!
  }

  union LinkedIdentity = OrcidLinkedIdentity
`;

export default linkedIdentityTypeDef;
