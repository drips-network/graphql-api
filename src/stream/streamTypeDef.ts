import gql from 'graphql-tag';

const streamTypeDef = gql`
  type StreamConfig {
    raw: String!
    dripId: String!
    amountPerSecond: Amount!
    startDate: Date
    durationSeconds: Int
  }

  union StreamReceiver = AddressDriverAccount | NftDriverAccount

  type Stream {
    id: ID!
    sender: AddressDriverAccount!
    receiver: StreamReceiver!
    config: StreamConfig!
    isPaused: Boolean!
    name: String
    description: String
    isArchived: Boolean
    isManaged: Boolean!
    totalStreamed: [MovingAmount!]!
  }

  input StreamWhereInput {
    senderId: ID
    receiverId: ID
  }
`;

export default streamTypeDef;
