import type {
  TimelineItem,
  TimelineItemType,
  UserBalanceTimelineItem,
} from '../generated/graphql';

interface Amount {
  tokenAddress: string;
  amount: bigint;
}

// eslint-disable-next-line import/prefer-default-export
export function currentAmounts(
  timeline: (TimelineItem | UserBalanceTimelineItem)[],
  tokenAddress: string,
  atTime = new Date(Date.now()),
): {
  currentAmount: Amount;
  currentDeltaPerSecond: Amount;
  lastTimelineItemType: TimelineItemType | undefined;
} {
  const now = atTime.getTime();

  const nextTimelineItemIndex = timeline.findIndex(
    (item) => new Date(item.timestamp).getTime() > now,
  );

  const currentlyActiveTimelineItem =
    nextTimelineItemIndex === -1
      ? timeline[timeline.length - 1]
      : timeline[nextTimelineItemIndex - 1];

  if (!currentlyActiveTimelineItem) {
    return {
      currentAmount: { tokenAddress, amount: BigInt(0) },
      currentDeltaPerSecond: { tokenAddress, amount: BigInt(0) },
      lastTimelineItemType: undefined,
    };
  }

  const millisSinceLastTimelineItem =
    now - new Date(currentlyActiveTimelineItem.timestamp).getTime();

  const lastAmount = BigInt(currentlyActiveTimelineItem.currentAmount.amount);

  const lastDeltaPerSecond = BigInt(
    currentlyActiveTimelineItem.deltaPerSecond.amount,
  );

  const currentAmount =
    lastAmount +
    (lastDeltaPerSecond * BigInt(millisSinceLastTimelineItem)) / BigInt(1000);

  return {
    currentAmount: {
      tokenAddress: currentlyActiveTimelineItem.currentAmount.tokenAddress,
      amount: currentAmount,
    },
    currentDeltaPerSecond: {
      tokenAddress: currentlyActiveTimelineItem.deltaPerSecond.tokenAddress,
      amount: lastDeltaPerSecond,
    },
    lastTimelineItemType:
      currentlyActiveTimelineItem.__typename === 'TimelineItem'
        ? currentlyActiveTimelineItem.type
        : undefined,
  };
}
