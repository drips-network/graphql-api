import gql from 'graphql-tag';

const commonTypeDef = gql`
  enum AccountType {
    AddressDriver
    RepoDriver
    NftDriver
  }

  type ProjectAccount {
    driver: AccountType!
    accountId: ID!
  }

  type AddressAccount {
    driver: AccountType!
    accountId: ID!
    address: String!
  }

  type DripListAccount {
    driver: AccountType!
    accountId: ID!
  }

  enum ReceiverType {
    Address
    Project
    DripList
  }

  type AddressReceiver {
    type: ReceiverType!
    weight: Int!
    account: AddressAccount!
  }

  enum Forge {
    GitHub
    GitLab
  }

  type Source {
    forge: Forge!
    url: String!
    repoName: String!
    ownerName: String!
  }
  type ProjectReceiver {
    type: ReceiverType!
    weight: Int!
    project: Project!
    source: Source!
  }

  type DripListReceiver {
    type: ReceiverType!
    weight: Int!
    account: DripListAccount!
  }

  union SplitsReceiver = AddressReceiver | ProjectReceiver | DripListReceiver
`;

export default commonTypeDef;
