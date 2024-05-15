import gql from 'graphql-tag';

const streamTypeDef = gql`
  type StreamConfig {
    raw: String!
    dripId: String!
    amountPerSecond: Amount!
    startDate: Date
    durationSeconds: Int
  }

  union StreamReceiver = User | DripList

  enum TimelineItemType {
    START
    END
    PAUSE
    OUT_OF_FUNDS
  }

  type TimelineItem {
    type: TimelineItemType!
    timestamp: Date!
    currentAmount: Amount!
    deltaPerSecond: Amount!
  }

  type Stream {
    id: ID!
    sender: User!
    receiver: StreamReceiver!
    config: StreamConfig!
    isPaused: Boolean!
    name: String
    description: String
    isArchived: Boolean
    isManaged: Boolean!
    timeline: [TimelineItem!]!
    createdAt: Date!
    endsAt: Date
  }

  input StreamWhereInput {
    senderId: ID
    receiverId: ID
  }
`;

export default streamTypeDef;
