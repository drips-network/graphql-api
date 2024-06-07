import type { AccountId } from '../common/types';
import type { SupportedChain } from '../generated/graphql';
import dripsContracts from '../common/dripsContracts';
import streamReceiverSeenEventQueries from '../dataLoaders/sqlQueries/streamReceiverSeenEventQueries';
import streamsSetEventsQueries from '../dataLoaders/sqlQueries/streamsSetEventsQueries';
import givenEventsQueries from '../dataLoaders/sqlQueries/givenEventsQueries';
import splitEventsQueries from '../dataLoaders/sqlQueries/splitEventsQueries';

export default async function getWithdrawableBalances(
  accountId: AccountId,
  chain: SupportedChain,
) {
  const streamReceiverSeenEventsForUser =
    await streamReceiverSeenEventQueries.getByAccountId([chain], accountId);

  const [
    incomingStreamTokenAddresses,
    incomingGivesTokenAddresses,
    incomingSplitEventsTokenAddresses,
  ] = await Promise.all([
    streamsSetEventsQueries.getDistinctErc20ByReceiversHashes(
      [chain],
      streamReceiverSeenEventsForUser.map((event) => event.receiversHash),
    ),
    givenEventsQueries.getDistinctErc20ByReceiver([chain], accountId),
    splitEventsQueries.getDistinctErc20ByReceiver([chain], accountId),
  ]);

  const relevantTokenAddresses = [
    ...incomingStreamTokenAddresses,
    ...incomingGivesTokenAddresses,
    ...incomingSplitEventsTokenAddresses,
  ].reduce<string[]>((acc, tokenAddress) => {
    if (!acc.includes(tokenAddress)) {
      return [...acc, tokenAddress];
    }

    return acc;
  }, []);

  const balances: {
    [tokenAddress: string]: {
      splittable: bigint;
      receivable: bigint;
      collectable: bigint;
    };
  } = Object.fromEntries(
    await Promise.all(
      relevantTokenAddresses.map(async (tokenAddress) => {
        const { drips } = dripsContracts[chain]!;

        const [splittable, receivable, collectable] = await Promise.all([
          drips.splittable(accountId, tokenAddress),
          drips.receiveStreamsResult(accountId, tokenAddress, 10000),
          drips.collectable(accountId, tokenAddress),
        ]);

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
