import gql from 'graphql-tag';

const userTypeDef = gql`
  type UserStreams {
    incoming: [Stream]!
    outgoing: [Stream]!
  }

  type User {
    account: AddressDriverAccount!
    streams: UserStreams!
    projects: [Project]!
    dripLists: [DripList]!
  }
`;

export default userTypeDef;
