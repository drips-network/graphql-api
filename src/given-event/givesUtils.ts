import type { ResolverGive, ResolverGiveChainData } from '../common/types';
import { type SupportedChain } from '../generated/graphql';
import type { GivenEventModelDataValues } from './GivenEventModel';

export default async function toResolverGives(
  chains: SupportedChain[],
  givenEventsDataValues: GivenEventModelDataValues[],
): Promise<ResolverGive[]> {
  return Promise.all(
    givenEventsDataValues.map(async (givenEventDataValues) => {
      const chainData = await Promise.all(
        chains.map(async (chain) => {
          if (givenEventDataValues.chain === chain) {
            return {
              chain,
              data: {
                ...givenEventDataValues,
              },
            } as ResolverGiveChainData;
          }

          return {
            chain,
            data: null,
          };
        }),
      );

      // TODO: Implement the driver for the sender and receiver. Currently, it is an empty object, as we don't use this now.
      return {
        sender: {
          accountId: givenEventDataValues.accountId,
          driver: {} as any,
        },
        receiver: {
          accountId: givenEventDataValues.receiver,
          driver: {} as any,
        },
        chainData,
      } as ResolverGive;
    }),
  );
}
