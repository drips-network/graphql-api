import type { ResolverDripList, ResolverDripListData } from '../common/types';
import { Driver, type SupportedChain } from '../generated/graphql';
import type { DripListDataValues } from './DripListModel';

export async function toResolverDripList(
  chain: SupportedChain,
  dripList: DripListDataValues,
): Promise<ResolverDripList> {
  return (await toResolverDripLists([chain], [dripList]))[0];
}

export async function toResolverDripLists(
  chains: SupportedChain[],
  dripLists: DripListDataValues[],
): Promise<ResolverDripList[]> {
  return Promise.all(
    dripLists.map(async (dripList) => {
      const relevantChains = chains.filter((chain) => dripList.chain === chain);

      const chainData = await Promise.all(
        relevantChains.map(
          async (chain) =>
            ({
              chain,
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
