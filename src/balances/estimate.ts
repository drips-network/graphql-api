import type {
  AccountEstimate,
  AddressDriverAccount,
  AssetConfig,
  AssetConfigEstimate,
  AssetConfigEstimates,
  AssetConfigHistoryItem,
  HistoricalStream,
  StreamEstimate,
  UserAccount,
} from '../generated/graphql';
import type SqueezedStreamsEventModel from '../models/SqueezedStreamsEventModel';
import minMax from '../utils/minMax';
import { unwrapIdItems } from '../utils/wrap-unwrap-id-item';

type Millis = number;
type StreamId = string;

interface Cycle {
  start: Date;
  duration: Millis;
}

interface TimeWindow {
  from: Millis;
  to: Millis;
}

export function estimateAccount(
  account: UserAccount,
  currentCycle: Cycle,
  excludingSqueezes: SqueezedStreamsEventModel[] = [],
): AccountEstimate {
  const accountEstimate = Object.fromEntries(
    account.assetConfigs.map((assetConfig) => [
      assetConfig.tokenAddress.toLowerCase(),
      buildAssetConfigEstimates(
        assetConfig,
        currentCycle,
        account.user,
        excludingSqueezes,
      ),
    ]),
  );

  return {
    estimates: Object.entries(accountEstimate).map(
      ([tokenAddress, config]) => ({
        tokenAddress,
        config,
      }),
    ),
  };
}

function buildAssetConfigEstimates(
  assetConfig: AssetConfig,
  currentCycle: Cycle,
  user: AddressDriverAccount,
  excludingSqueezes: SqueezedStreamsEventModel[],
): AssetConfigEstimates {
  /*
    TODO: Avoid processing the current cycle twice by bounding totalEstimate to before the current cycle,
    and adding the estimates up.
  */
  const totalEstimate = estimateAssetConfig(
    assetConfig,
    { from: 0, to: Number.MAX_SAFE_INTEGER },
    user,
  );
  const currentCycleEstimate = estimateAssetConfig(
    assetConfig,
    {
      from: currentCycle.start.getTime(),
      to: currentCycle.start.getTime() + currentCycle.duration,
    },
    user,
    excludingSqueezes,
  );

  return {
    total: totalEstimate,
    currentCycle: currentCycleEstimate,
  };
}

export function estimateAssetConfig(
  assetConfig: AssetConfig,
  window: TimeWindow,
  user: AddressDriverAccount,
  excludingSqueezes: SqueezedStreamsEventModel[] = [],
): AssetConfigEstimate {
  // Filter out any history items not relevant to the current time window.
  const relevantHistoryItems = assetConfig.history.filter((hi) => {
    const timestamp = hi.timestamp.getTime();
    const nextTimestamp =
      assetConfig.history[
        assetConfig.history.indexOf(hi) + 1
      ]?.timestamp.getTime();

    const startsWithinWindow =
      timestamp <= window.to && timestamp >= window.from;
    const windowIsAfterLastEvent = !nextTimestamp && timestamp < window.from;
    const endsWithinWindow = nextTimestamp && nextTimestamp >= window.from;

    return startsWithinWindow || windowIsAfterLastEvent || endsWithinWindow;
  });

  const historyItemEstimates = relevantHistoryItems.map(
    (historyItem, index, historyItems) => {
      const nextHistoryItem = historyItems[index + 1];

      return estimateHistoryItem(
        window,
        historyItem,
        nextHistoryItem,
        assetConfig.tokenAddress,
        user,
        excludingSqueezes,
      );
    },
  );

  const streamTotals = historyItemEstimates.reduce<{
    [stream: StreamId]: StreamEstimate;
  }>((acc, historyItemEstimate) => {
    const nextItem =
      historyItemEstimates[
        historyItemEstimates.indexOf(historyItemEstimate) + 1
      ];
    const { streams } = historyItemEstimate;

    for (const stream of streams) {
      const currentVal = acc[stream.id];

      acc[stream.id] = {
        ...stream,
        ...acc[stream.id],
        totalStreamed: (currentVal?.totalStreamed ?? 0n) + stream.totalStreamed,
        currentAmountPerSecond: nextItem ? '0' : stream.currentAmountPerSecond,
      };
    }

    return acc;
  }, {});

  const streams = unwrapIdItems(streamTotals);

  const totalStreamed = sumEstimates('totalStreamed', streams);
  const totalAmountPerSecond = sumEstimates('currentAmountPerSecond', streams);
  const { remainingBalance } =
    historyItemEstimates[historyItemEstimates.length - 1]?.totals ?? 0n;

  return {
    streams,
    totals: {
      totalStreamed,
      totalAmountPerSecond,
      remainingBalance,
    },
  };
}

function estimateHistoryItem(
  window: TimeWindow,
  historyItem: AssetConfigHistoryItem,
  nextHistoryItem: AssetConfigHistoryItem,
  tokenAddress: string,
  sender: AddressDriverAccount,
  excludingSqueezes: SqueezedStreamsEventModel[],
): AssetConfigEstimate {
  const streamEstimates = historyItem.streams.map((receiver) => {
    const estimate = streamedByStream(
      window,
      receiver,
      sender,
      historyItem,
      excludingSqueezes,
      nextHistoryItem,
    );

    return {
      id: receiver.streamId,
      totalStreamed: estimate.streamed.toString(),
      currentAmountPerSecond: estimate.currentAmountPerSecond.toString(),
      receiver: receiver.receiver,
      sender,
      tokenAddress,
    };
  });

  const totalStreamed = sumEstimates('totalStreamed', streamEstimates);
  const totalAmountPerSecond = sumEstimates(
    'currentAmountPerSecond',
    streamEstimates,
  );
  const remainingBalance =
    BigInt(historyItem.balance.amount) - BigInt(totalStreamed);

  return {
    streams: streamEstimates,
    totals: {
      totalStreamed,
      remainingBalance: remainingBalance.toString(),
      totalAmountPerSecond,
    },
  };
}

function streamedByStream(
  window: TimeWindow,
  receiver: HistoricalStream,
  sender: AddressDriverAccount,
  historyItem: AssetConfigHistoryItem,
  excludingSqueezes: SqueezedStreamsEventModel[],
  nextHistoryItem?: AssetConfigHistoryItem,
): {
  streamed: bigint;
  currentAmountPerSecond: bigint;
} {
  // Undefined streamConfig means the stream was paused.
  if (!receiver.config) {
    return {
      streamed: 0n,
      currentAmountPerSecond: 0n,
    };
  }

  const { timestamp: nextTimestampDate } = nextHistoryItem ?? {};
  const nextTimestamp: Millis = nextTimestampDate
    ? nextTimestampDate.getTime()
    : new Date().getTime();

  const { runsOutOfFunds: runsOutOfFundsTimestamp, timestamp: timestampDate } =
    historyItem;
  const runsOutOfFunds: Millis | undefined = runsOutOfFundsTimestamp
    ? runsOutOfFundsTimestamp.getTime()
    : undefined;
  const timestamp: Millis = timestampDate.getTime();

  const { durationSeconds, amountPerSecond, startDate } = receiver.config;

  const duration: Millis | undefined = durationSeconds
    ? durationSeconds * 1000
    : undefined;
  const start: Millis = startDate ? startDate.getTime() : timestamp;

  const squeezedAtBlockTimestamp = excludingSqueezes.find(
    (squeezeEvent) =>
      squeezeEvent.senderId === sender.accountId &&
      squeezeEvent.streamsHistoryHashes.includes(historyItem.historyHash),
  )?.blockTimestamp;
  const squeezedAt: Millis | undefined = squeezedAtBlockTimestamp
    ? Number(squeezedAtBlockTimestamp) * 1000
    : undefined;

  const streamingFrom = minMax(
    'max',
    timestamp,
    start,
    window.from,
    squeezedAt,
  );
  const scheduledToEndAt = calcScheduledEnd(streamingFrom, start, duration);
  const streamingUntil = minMax(
    'min',
    runsOutOfFunds,
    scheduledToEndAt,
    nextTimestamp,
    window.to,
  );
  const validForMillis = minMax('max', streamingUntil - streamingFrom, 0);

  const streamed =
    (BigInt(validForMillis) * BigInt(amountPerSecond.amount)) / 1000n;
  const currentAmountPerSecond =
    streamingUntil >= nextTimestamp && streamingFrom < nextTimestamp
      ? amountPerSecond.amount
      : 0n;

  return {
    streamed,
    currentAmountPerSecond: BigInt(currentAmountPerSecond),
  };
}

function sumEstimates(
  mode: 'totalStreamed' | 'currentAmountPerSecond',
  streamEstimates: StreamEstimate[],
): string {
  const res = streamEstimates.reduce<bigint>(
    (acc, streamEstimate) => acc + BigInt(streamEstimate[mode]),
    0n,
  );
  return res.toString();
}

function calcScheduledEnd(
  timestamp: Millis,
  start?: Millis,
  duration?: Millis,
): Millis | undefined {
  return duration ? (start ?? timestamp) + duration : undefined;
}
