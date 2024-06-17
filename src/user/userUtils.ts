import type { AddressDriverId, ResolverUser } from '../common/types';
import { Driver, type SupportedChain } from '../generated/graphql';
import getUserAddress from '../utils/getUserAddress';

export default function toResolverUser(
  chains: SupportedChain[],
  accountId: AddressDriverId,
): ResolverUser {
  return {
    account: {
      accountId,
      address: getUserAddress(accountId),
      driver: Driver.ADDRESS,
    },
    chainData: chains.map((chain) => ({
      chain,
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
