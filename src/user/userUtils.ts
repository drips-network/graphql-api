import type { AddressDriverId, DbSchema, ResolverUser } from '../common/types';
import { Driver } from '../generated/graphql';
import { dbSchemaToChain } from '../utils/chainSchemaMappings';
import getUserAddress from '../utils/getUserAddress';

export default function toResolverUser(
  chains: DbSchema[],
  accountId: AddressDriverId,
): ResolverUser {
  return {
    account: {
      accountId,
      address: getUserAddress(accountId),
      driver: Driver.ADDRESS,
    },
    chainData: chains.map((chain) => ({
      chain: dbSchemaToChain[chain],
      parentUserInfo: {
        accountId,
        queriedChains: chains,
        userChain: chain,
      },
      balances: [], // Will be populated by the resolver.
      dripLists: [], // Will be populated by the resolver.
      projects: [], // Will be populated by the resolver.
      streams: {
        incoming: [], // Will be populated by the resolver.
        outgoing: [], // Will be populated by the resolver.
      },
      support: [], // Will be populated by the resolver.
      withdrawableBalances: [], // Will be populated by the resolver.
    })),
  };
}
