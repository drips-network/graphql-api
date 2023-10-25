import gql from 'graphql-tag';

const dripListTypeDef = gql`
  type DripListOwner {
    accountId: ID!
    driver: Driver!
    address: String!
  }

  type DripList {
    id: ID!
    name: String
    splits: Splits
    isPublic: Boolean!
    owner: DripListOwner!
    previousOwnerAddress: String!
  }

  input DripListWhereInput {
    id: String
    ownerAddress: String
  }
`;

export default dripListTypeDef;
