import type { AccountId, DbSchema } from '../common/types';
import dripsContracts from '../common/dripsContracts';
import { dbSchemaToChain } from './chainSchemaMappings';
import getTokens from '../dataLoaders/sqlQueries/getTokens';

export async function getTokenBalancesOnChain(
  accountId: AccountId,
  tokenAddress: string,
  chain: DbSchema,
) {
  const { drips } = dripsContracts[dbSchemaToChain[chain]]!;

  const [splittable, receivable, collectable] = await Promise.all([
    drips.splittable(accountId, tokenAddress),
    drips.receiveStreamsResult(accountId, tokenAddress, 10000),
    drips.collectable(accountId, tokenAddress),
  ]);

  return {
    splittable,
    receivable,
    collectable,
  };
}

export default async function getWithdrawableBalancesOnChain(
  accountId: AccountId,
  chain: DbSchema,
) {
  const relevantTokenAddresses = await getTokens(chain);

  const balances: {
    [tokenAddress: string]: {
      splittable: bigint;
      receivable: bigint;
      collectable: bigint;
    };
  } = Object.fromEntries(
    await Promise.all(
      relevantTokenAddresses.map(async (tokenAddress) => {
        const { splittable, receivable, collectable } =
          await getTokenBalancesOnChain(accountId, tokenAddress, chain);

        return [tokenAddress, { splittable, receivable, collectable }];
      }),
    ),
  );

  return Object.entries(balances).map(
    ([tokenAddress, { splittable, receivable, collectable }]) => ({
      tokenAddress,
      splittableAmount: splittable.toString(),
      receivableAmount: receivable.toString(),
      collectableAmount: collectable.toString(),
    }),
  );
}
