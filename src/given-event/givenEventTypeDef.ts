import gql from 'graphql-tag';

const givenEventTypeDef = gql`
  type Give {
    sender: Account!
    receiver: Account!
    amount: Amount!
    blockTimestamp: String!
  }

  input GiveWhereInput {
    senderAccountId: String
    receiverAccountId: String
    tokenAddress: String
  }
`;

export default givenEventTypeDef;
