/* eslint-disable no-continue */

import {
  TimelineItemType,
  type AssetConfigHistoryItem,
  type Scalars,
  type TimelineItem,
} from '../generated/graphql';
import minMax from '../utils/minMax';

type BalanceTimeline = TimelineItem[];

interface AssetBalanceTimelineItem {
  timestamp: Date;
  balance: bigint;
  deltaPerSecond: bigint;
}

export function assetOutgoingBalanceTimeline(
  historyItems: AssetConfigHistoryItem[],
): AssetBalanceTimelineItem[] {
  historyItems.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const timeline: AssetBalanceTimelineItem[] = [];

  for (const item of historyItems) {
    const { streams } = item;

    const timestamp = new Date(item.timestamp);

    const nextHistoryItem: AssetConfigHistoryItem | undefined =
      historyItems[historyItems.indexOf(item) + 1];
    const nextTimestamp = nextHistoryItem
      ? new Date(nextHistoryItem.timestamp)
      : undefined;

    // Between historyItems, we need to add additional timeline entries for streams that have start or end dates scheduled. We first
    // construct this array of just timestamps which will later be merged with historyItems into the final timeline.
    const additionalTimelineEntries: Date[] = [];

    for (const stream of streams) {
      const { config } = stream;

      if (!config) continue;

      const { startDate: startDateRaw, durationSeconds } = config;
      const startDate = startDateRaw ? new Date(startDateRaw) : undefined;

      // If there's a startDate configured for the stream, we need to check whether the stream has already started before the current historyItem or not, and:
      //
      // - If it has started before, we don't need to add an additional timeline entry.
      // - If it starts after the next historyItem, we don't need to add an additional timeline entry either.
      // - If it starts between the current and next historyItem, we need to add an additional timeline entry timestamp.
      // - If there is no next historyItem, but the stream starts after the current historyItem, we need to add an additional timeline entry timestamp as well.
      if (startDate) {
        if (
          startDate.getTime() > timestamp.getTime() &&
          (!nextTimestamp || startDate.getTime() < nextTimestamp.getTime())
        ) {
          additionalTimelineEntries.push(startDate);
        }
      }

      // If there is a duration, we need to compute the end date (either startDate OR the timestamp of the current historyItem + duration seconds).
      // Then, we check if the end date is between the current and next historyItem, and if so, we add an additional timeline entry timestamp.
      // If there is no next historyItem, but the end date is after the current historyItem, we need to add an additional timeline entry timestamp as well.
      if (durationSeconds) {
        const endDate = startDate
          ? new Date(startDate.getTime() + durationSeconds * 1000)
          : new Date(timestamp.getTime() + durationSeconds * 1000);

        if (
          endDate.getTime() > timestamp.getTime() &&
          (!nextTimestamp || endDate.getTime() < nextTimestamp.getTime())
        ) {
          additionalTimelineEntries.push(endDate);
        }
      }
    }

    // If the assetConfig runs out of funds before the next historyItem, we need to add an additional timeline entry timestamp.
    // If there is no next historyItem, but the assetConfig runs out of funds after the current historyItem, we need to add an additional timeline entry timestamp as well.
    if (
      BigInt(item.balance.amount) > 0n &&
      item.runsOutOfFunds &&
      (!nextTimestamp ||
        new Date(item.runsOutOfFunds).getTime() < nextTimestamp.getTime())
    ) {
      additionalTimelineEntries.push(new Date(item.runsOutOfFunds));
    }

    additionalTimelineEntries.sort((a, b) => a.getTime() - b.getTime());

    // Add the current historyItem to the timeline, then compute the balance and deltaPerSecond for each additional timeline entry.
    // For each item we add to the timeline, we need to compute the balance and deltaPerSecond at that point in time.
    for (const [index, ts] of [
      timestamp,
      ...additionalTimelineEntries,
    ].entries()) {
      const previousTimelineItem: AssetBalanceTimelineItem | undefined =
        timeline[timeline.length - 1];

      const previousBalance = previousTimelineItem
        ? previousTimelineItem.balance
        : 0n;

      const previousDeltaPerSecond = previousTimelineItem
        ? previousTimelineItem.deltaPerSecond
        : 0n;

      const secondsPassedSinceLastEvent = previousTimelineItem
        ? (ts.getTime() - previousTimelineItem.timestamp.getTime()) / 1000
        : 0;

      const totalStreamedSinceLastEvent =
        previousDeltaPerSecond * BigInt(secondsPassedSinceLastEvent);

      let currentBalance =
        index === 0
          ? BigInt(item.balance.amount)
          : previousBalance - totalStreamedSinceLastEvent;
      if (currentBalance < 0) currentBalance = 0n;

      const currentDeltaPerSecond =
        currentBalance > 0n
          ? streams.reduce((acc, stream) => {
              const { config } = stream;

              if (!config) return acc;

              const { startDate, durationSeconds, amountPerSecond } = config;

              if (startDate && startDate.getTime() > ts.getTime()) return acc;

              if (durationSeconds && startDate) {
                const endDate = new Date(
                  startDate.getTime() + durationSeconds * 1000,
                );
                if (endDate.getTime() < ts.getTime()) return acc;
              }

              return acc + BigInt(amountPerSecond.amount);
            }, 0n)
          : 0n;

      timeline.push({
        timestamp: ts,
        balance: currentBalance,
        deltaPerSecond: currentDeltaPerSecond,
      });
    }
  }

  return timeline;
}

export function streamTotalStreamedTimeline(
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
      if (
        config.startDate &&
        new Date(config.startDate).getTime() >
          new Date(item.timestamp).getTime()
      ) {
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

        // End event timestamp should be the stream end date, OR the timestamp of
        // when the new stream end date was set, depending on which is later
        const endEventTimestamp = new Date(
          minMax('max', streamEnd.getTime(), item.timestamp.getTime()),
        );

        timelineSketch.push({
          type: TimelineItemType.END,
          timestamp: endEventTimestamp,
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

    const lastTimelineItem = timeline[timeline.length - 1];

    const lastAmountPerSecond = lastTimelineItem?.deltaPerSecond.amount ?? 0n;

    const totalStreamedSinceLastEvent =
      BigInt(lastAmountPerSecond) * BigInt(secondsPassedSinceLastEvent);
    const currentAmountPerSec =
      item.type === TimelineItemType.END ||
      item.type === TimelineItemType.OUT_OF_FUNDS
        ? 0n
        : BigInt(currentStreamConfig?.amountPerSecond.amount || 0);

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
