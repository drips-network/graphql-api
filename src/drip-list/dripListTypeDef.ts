import gql from 'graphql-tag';

const dripListTypeDef = gql`
  type DripList {
    name: String!
    creator: String!
    description: String
    splits: [SplitsReceiver!]!
    account: NftDriverAccount!
    owner: AddressDriverAccount!
    previousOwnerAddress: String!
    support: [SupportItem!]!
    latestVotingRoundId: String
    chain: Chain!
  }

  input DripListWhereInput {
    id: String
    ownerAddress: String
  }
`;

export default dripListTypeDef;
