import type { DbSchema, MultiChainKey } from '../common/types';

type ExtractedValues<T> = {
  ids: (T extends { id: infer ID } ? ID : never)[];
  chains: DbSchema[];
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
