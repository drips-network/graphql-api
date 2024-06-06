import type { MultiChainKey } from '../common/types';
import type { SupportedChain } from '../generated/graphql';

type ExtractedValues<T> = {
  ids: (T extends { id: infer ID } ? ID : never)[];
  chains: SupportedChain[];
};

export default function parseMultiChainKeys<T extends MultiChainKey>(
  keys: ReadonlyArray<T>,
): ExtractedValues<T> {
  const ids = keys.map((key) => key.id);
  const chains = new Set(keys.flatMap((key) => key.chains));

  return {
    ids: ids as ExtractedValues<T>['ids'],
    chains: [...chains],
  };
}
