import { Op, col, fn } from 'sequelize';
import type { AccountId } from '../common/types';
import GivenEventModel from '../given-event/GivenEventModel';
import SplitEventModel from '../models/SplitEventModel';
import StreamReceiverSeenEventModel from '../models/StreamReceiverSeenEventModel';
import StreamsSetEventModel from '../models/StreamsSetEventModel';
import appSettings from '../common/appSettings';
import { Drips__factory } from '../generated/contracts';
import FailoverProvider from '../common/FailoverProvider';

function getDripsContract() {
  return Drips__factory.connect(
    appSettings.dripsAddress,
    FailoverProvider.getActiveProvider(),
  );
}

export async function getRelevantTokens(accountId: AccountId) {
  const streamReceiverSeenEventsForUser =
    await StreamReceiverSeenEventModel.findAll({
      where: {
        accountId,
      },
    });

  const [
    incomingStreamTokenAddresses,
    incomingGivesTokenAddresses,
    incomingSplitEventsTokenAddresses,
  ] = await Promise.all([
    StreamsSetEventModel.findAll({
      attributes: [[fn('DISTINCT', col('erc20')), 'erc20']],
      where: {
        receiversHash: {
          [Op.in]: streamReceiverSeenEventsForUser.map(
            (event) => event.receiversHash,
          ),
        },
      },
    }),
    GivenEventModel.findAll({
      attributes: [[fn('DISTINCT', col('erc20')), 'erc20']],
      where: {
        receiver: accountId,
      },
    }),
    SplitEventModel.findAll({
      attributes: [[fn('DISTINCT', col('erc20')), 'erc20']],
      where: {
        receiver: accountId,
      },
    }),
  ]);

  return [
    ...incomingStreamTokenAddresses.map((event) => event.erc20),
    ...incomingGivesTokenAddresses.map((event) => event.erc20),
    ...incomingSplitEventsTokenAddresses.map((event) => event.erc20),
  ].reduce<string[]>((acc, tokenAddress) => {
    if (!acc.includes(tokenAddress)) {
      return [...acc, tokenAddress];
    }

    return acc;
  }, []);
}

export async function getTokenBalances(
  accountId: AccountId,
  tokenAddress: string,
) {
  const drips = getDripsContract();
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

export default async function getWithdrawableBalances(accountId: AccountId) {
  const relevantTokenAddresses = await getRelevantTokens(accountId);

  const balances: {
    [tokenAddress: string]: {
      splittable: bigint;
      receivable: bigint;
      collectable: bigint;
    };
  } = Object.fromEntries(
    await Promise.all(
      relevantTokenAddresses.map(async (tokenAddress) => {
        const { splittable, receivable, collectable } = await getTokenBalances(
          accountId,
          tokenAddress,
        );

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
