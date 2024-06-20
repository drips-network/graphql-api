import type { DbSchema } from '../common/types';

type Amount = {
  amount: bigint;
  tokenAddress: string;
};

/**
 * Take any number of arrays of amounts, and merge them into a single array of amounts,
 * where each particular tokenAddress appears once.
 * @param args The arrays of amounts to add together.
 */
export default function mergeAmounts(
  ...args: (Amount & { chain: DbSchema })[][]
) {
  const amounts = new Map<string, Amount>();

  args.forEach((amountsArray) => {
    amountsArray.forEach((amount) => {
      // Create a unique key using both tokenAddress and chain
      const key = `${amount.tokenAddress}-${amount.chain}`;
      const existingAmount = amounts.get(key);

      if (existingAmount) {
        // If there is already an entry, add the new amount to the existing one
        amounts.set(key, {
          ...existingAmount,
          amount: existingAmount.amount + amount.amount,
        });
      } else {
        // Otherwise, add the new amount to the map
        amounts.set(key, amount);
      }
    });
  });

  return Array.from(amounts.values());
}
