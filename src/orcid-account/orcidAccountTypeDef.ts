import gql from 'graphql-tag';

const orcidAccountTypeDef = gql`
  type OrcidAccount {
    source: OrcidSource!
    account: RepoDriverAccount!
    chainData: [OrcidAccountData!]!
  }

  union OrcidAccountData = ClaimedOrcidAccountData | UnClaimedOrcidAccountData

  type ClaimedOrcidAccountData {
    chain: SupportedChain!
    linkedTo: AddressDriverAccount!
    support: [SupportItem!]!
    totalEarned: [Amount!]!
    withdrawableBalances: [WithdrawableBalance!]!
  }

  type UnClaimedOrcidAccountData {
    chain: SupportedChain!
    linkedTo: AddressDriverAccount
    support: [SupportItem!]!
    withdrawableBalances: [WithdrawableBalance!]!
  }

  input OrcidAccountWhereInput {
    accountId: String
    ownerAddress: String
    isLinked: Boolean
  }

  input OrcidAccountSortInput {
    field: OrcidAccountSortField!
    direction: SortDirection
  }

  enum OrcidAccountSortField {
    createdAt
  }
`;

export default orcidAccountTypeDef;
