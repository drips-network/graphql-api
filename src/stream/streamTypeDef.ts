import gql from 'graphql-tag';

const streamsTypeDef = gql`
  type Stream {
    id: ID!
  }
`;

export default streamsTypeDef;
