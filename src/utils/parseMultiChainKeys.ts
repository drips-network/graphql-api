import type { SupportedChain } from '../generated/graphql';
import shouldNeverHappen from './shouldNeverHappen';

type MultiChainKey = { chains: SupportedChain[] };

type ExtractedValues<T> = {
  ids: (T extends { projectId: infer P }
    ? P
    : T extends { dripListId: infer D }
    ? D
    : never)[];
  chains: SupportedChain[];
};

export default function parseMultiChainKeys<
  T extends MultiChainKey & { [key: string]: any },
>(keys: ReadonlyArray<T>): ExtractedValues<T> {
  const ids = keys.map((key) => key.projectId ?? key.dripListId);
  const chainsToQuery = keys.map((key) => key.chains);

  if (
    chainsToQuery.some(
      (chain) => JSON.stringify(chain) !== JSON.stringify(chainsToQuery[0]),
    )
  ) {
    shouldNeverHappen('Chains are not the same within a batch.');
  }

  return {
    ids,
    chains: chainsToQuery[0],
  };
}
