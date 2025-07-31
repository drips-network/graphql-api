import type { DbSchema, ResolverSubList } from '../common/types';
import { Driver } from '../generated/graphql';
import { dbSchemaToChain } from '../utils/chainSchemaMappings';
import { singleOrDefault } from '../utils/linq';
import type { SubListDataValues } from './SubListModel';

export async function toResolverSubList(
  chain: DbSchema,
  subList: SubListDataValues,
): Promise<ResolverSubList> {
  return (await toResolverSubLists([chain], [subList]))[0];
}

export async function toResolverSubLists(
  chains: DbSchema[],
  subLists: SubListDataValues[],
): Promise<ResolverSubList[]> {
  return (
    await Promise.all(
      subLists.map(async (subList) => {
        const subListChain = singleOrDefault(
          chains.filter((chain) => subList.chain === chain),
        );

        if (!subListChain) {
          return null;
        }

        return {
          account: {
            accountId: subList.accountId,
            driver: Driver.IMMUTABLE_SPLITS,
          },
          chain: dbSchemaToChain[subListChain],
          parentSubListInfo: {
            dripListId: subList.accountId,
            subListChain,
            queriedChains: chains,
          },
          support: [], // Will be populated by the resolver.
          splits: [], // Will be populated by the resolver.
          totalEarned: [], // Will be populated by the resolver.
          lastProcessedIpfsHash: subList.lastProcessedIpfsHash,
          parentAccountId: subList.parentAccountId,
          parentAccountType: subList.parentAccountType,
          rootAccountId: subList.rootAccountId,
          rootAccountType: subList.rootAccountType,
        } as ResolverSubList;
      }),
    )
  ).filter(Boolean) as ResolverSubList[];
}
