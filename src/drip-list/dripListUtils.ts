import type {
  DbSchema,
  ResolverDripList,
  ResolverDripListData,
} from '../common/types';
import { Driver } from '../generated/graphql';
import { dbSchemaToChain } from '../utils/chainSchemaMappings';
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
  return Promise.all(
    dripLists.map(async (dripList) => {
      const relevantChains = chains.filter((chain) => dripList.chain === chain);

      const chainData = await Promise.all(
        relevantChains.map(
          async (chain) =>
            ({
              chain: dbSchemaToChain[chain],
              parentDripListInfo: {
                dripListId: dripList.id,
                dripListChain: chain,
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
            }) as ResolverDripListData,
        ),
      );

      return {
        account: {
          accountId: dripList.id,
          driver: Driver.NFT,
        },
        chainData,
      } as ResolverDripList;
    }),
  );
}
