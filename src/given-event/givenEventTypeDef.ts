import gql from 'graphql-tag';

const givenEventTypeDef = gql`
  type Give {
    sender: Account!
    receiver: Account!
  }

  type GiveChainData {
    chain: SupportedChain!
    data: GiveData
  }

  type GiveData {
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
