import {
  TimelineItemType,
  type AssetConfigHistoryItem,
  type Scalars,
  type TimelineItem,
} from '../generated/graphql';

type BalanceTimeline = TimelineItem[];

export default function streamTotalStreamedTimeline(
  streamId: Scalars['ID']['output'],
  historyItems: AssetConfigHistoryItem[],
): BalanceTimeline {
  const relevantHistoryItems = historyItems.filter((item) =>
    item.streams.some((stream) => stream.streamId === streamId),
  );

  relevantHistoryItems.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  let timelineSketch: {
    type: TimelineItem['type'];
    timestamp: Date;
    associatedHistoryItem: AssetConfigHistoryItem;
  }[] = [];

  for (const item of relevantHistoryItems) {
    const stream = item.streams.find((s) => s.streamId === streamId);

    // discard any previous timeline sketch items that are further ahead than the timestamp of this history item
    timelineSketch = timelineSketch.filter(
      (ts) => ts.timestamp.getTime() <= new Date(item.timestamp).getTime(),
    );

    if (!stream) throw new Error('Stream not found in history item');

    const { config } = stream ?? {};

    if (!config) {
      // stream was paused
      timelineSketch.push({
        type: TimelineItemType.PAUSE,
        timestamp: item.timestamp,
        associatedHistoryItem: item,
      });
    } else {
      if (config.startDate && new Date(config.startDate) > item.timestamp) {
        // stream scheduled for the future
        timelineSketch.push({
          type: TimelineItemType.START,
          timestamp: new Date(config.startDate),
          associatedHistoryItem: item,
        });
      } else {
        // stream started
        timelineSketch.push({
          type: TimelineItemType.START,
          timestamp: item.timestamp,
          associatedHistoryItem: item,
        });
      }

      if (config.durationSeconds) {
        // stream was set with end duration
        const startDate = config.startDate
          ? new Date(config.startDate)
          : new Date(item.timestamp);
        const streamEnd = new Date(
          startDate.getTime() + config.durationSeconds * 1000,
        );

        timelineSketch.push({
          type: TimelineItemType.END,
          timestamp: streamEnd,
          associatedHistoryItem: item,
        });
      }

      if (item.runsOutOfFunds) {
        const endTimestamp = timelineSketch.find(
          (ts) => ts.type === TimelineItemType.END,
        )?.timestamp;
        const endTimestampDate = endTimestamp
          ? new Date(endTimestamp)
          : undefined;

        // if there is no end date before the runsOutOfFunds date, we add an out-of-funds event
        if (
          !endTimestampDate ||
          endTimestampDate.getTime() > new Date(item.runsOutOfFunds).getTime()
        ) {
          timelineSketch.push({
            type: TimelineItemType.OUT_OF_FUNDS,
            timestamp: item.runsOutOfFunds,
            associatedHistoryItem: item,
          });
        }

        // if there is also an end date AFTER the runsOutOfFunds date, we remove it from the sketch
        if (
          endTimestampDate &&
          endTimestampDate.getTime() > new Date(item.runsOutOfFunds).getTime()
        ) {
          timelineSketch = timelineSketch.filter(
            (ts) => ts.timestamp !== endTimestamp,
          );
        }
      }
    }

    timelineSketch.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  const timeline: BalanceTimeline = [];
  const { tokenAddress } = historyItems[0].balance;

  let totalStreamed = 0n;

  for (const [index, item] of timelineSketch.entries()) {
    const previousItem = index === 0 ? undefined : timelineSketch[index - 1];

    const currentStreamConfig = item.associatedHistoryItem.streams.find(
      (s) => s.streamId === streamId,
    )?.config;

    const secondsPassedSinceLastEvent = previousItem
      ? (item.timestamp.getTime() - previousItem.timestamp.getTime()) / 1000
      : 0;

    const lastAmountPerSecond = previousItem
      ? BigInt(
          previousItem.associatedHistoryItem.streams.find(
            (s) => s.streamId === streamId,
          )?.config?.amountPerSecond.amount || 0,
        )
      : 0n;

    const totalStreamedSinceLastEvent =
      lastAmountPerSecond * BigInt(secondsPassedSinceLastEvent);
    const currentAmountPerSec = BigInt(
      currentStreamConfig?.amountPerSecond.amount || 0,
    );

    totalStreamed += totalStreamedSinceLastEvent;

    timeline.push({
      type: item.type,
      currentAmount: {
        tokenAddress,
        amount: totalStreamed.toString(),
      },
      deltaPerSecond: {
        tokenAddress,
        amount: currentAmountPerSec.toString(),
      },
      timestamp: item.timestamp,
    });
  }

  return timeline;
}
