import type { DbSchema, ResolverDripList } from '../common/types';
import { Driver } from '../generated/graphql';
import { dbSchemaToChain } from '../utils/chainSchemaMappings';
import { singleOrDefault } from '../utils/linq';
import type { DripListDataValues } from './DripListModel';

export async function toResolverDripList(
  chain: DbSchema,
  dripList: DripListDataValues,
): Promise<ResolverDripList> {
  return (await toResolverDripLists([chain], [dripList]))[0];
}

export async function toResolverDripLists(
  chains: DbSchema[],
  dripLists: DripListDataValues[],
): Promise<ResolverDripList[]> {
  return (
    await Promise.all(
      dripLists.map(async (dripList) => {
        const dripListChain = singleOrDefault(
          chains.filter((chain) => dripList.chain === chain),
        );

        if (!dripListChain) {
          return null;
        }

        return {
          account: {
            accountId: dripList.id,
            driver: Driver.NFT,
          },
          chain: dbSchemaToChain[dripListChain],
          parentDripListInfo: {
            dripListId: dripList.id,
            dripListChain,
            queriedChains: chains,
          },
          name: dripList.name,
          creator: dripList.creator,
          description: dripList.description,
          owner: {
            driver: Driver.ADDRESS,
            accountId: dripList.ownerAccountId,
            address: dripList.ownerAddress as string,
          },
          previousOwnerAddress: dripList.previousOwnerAddress,
          support: [], // Will be populated by the resolver.
          splits: [], // Will be populated by the resolver.
          latestVotingRoundId: dripList.latestVotingRoundId,
          totalEarned: [], // Will be populated by the resolver.
        } as ResolverDripList;
      }),
    )
  ).filter(Boolean) as ResolverDripList[];
}
