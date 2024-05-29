import type { SupportedChain } from '../generated/graphql';

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
  const chains = new Set(keys.flatMap((key) => key.chains));

  return {
    ids,
    chains: [...chains],
  };
}
