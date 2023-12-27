import type { AccountMetadata, StreamsSetEventWithReceivers } from './types';
import assert from '../../utils/assert';
import buildStreamReceiver, {
  makeStreamId,
  matchMetadataStreamToReceiver,
  mapReceiverToStream,
  fromUint256,
} from './accountUtils';
import type {
  AddressDriverAccount,
  AssetConfig,
  AssetConfigHistoryItem,
  HistoricalStream,
} from '../../generated/graphql';
import getUserAddress from '../../utils/getUserAddress';
import type { AddressDriverId } from '../../common/types';
import { AMT_PER_SEC_MULTIPLIER } from '../../common/constants';
import toBigIntString from '../../utils/toBigIntString';

export default function buildAssetConfigs(
  accountId: AddressDriverId,
  accountMetadata: AccountMetadata | undefined,
  streamsSetEvents: Map<string, StreamsSetEventWithReceivers[]>,
) {
  return Array.from(streamsSetEvents.entries()).reduce<AssetConfig[]>(
    (acc, [tokenAddress, assetConfigStreamsSetEvents]) => {
      const assetConfigMetadata = accountMetadata?.assetConfigs.find(
        (ac) => ac.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
      );

      assert(
        assetConfigStreamsSetEvents && assetConfigStreamsSetEvents.length > 0,
        `Unable to find streamsSet events for asset config with token address ${tokenAddress}`,
      );

      const assetConfigHistoryItems: AssetConfigHistoryItem[] = [];

      for (const streamsSetEvent of assetConfigStreamsSetEvents) {
        const assetConfigHistoryItemStreams: HistoricalStream[] = [];

        const remainingStreamIds =
          assetConfigMetadata?.streams.map((stream) =>
            makeStreamId(
              accountId,
              tokenAddress,
              stream.initialDripsConfig.dripId,
            ),
          ) ?? [];

        for (const streamReceiverSeenEvent of streamsSetEvent.receivers) {
          const matchingStream = matchMetadataStreamToReceiver(
            streamReceiverSeenEvent,
            assetConfigMetadata?.streams ?? [],
          );

          const eventConfig = fromUint256(streamReceiverSeenEvent.config);

          const streamId = makeStreamId(
            accountId,
            tokenAddress,
            eventConfig.dripId.toString(),
          );

          const receiver = buildStreamReceiver(
            streamReceiverSeenEvent.accountId,
          );

          assetConfigHistoryItemStreams.push({
            streamId,
            config: {
              raw: streamReceiverSeenEvent.config,
              startDate:
                eventConfig.start > 0n
                  ? new Date(Number(eventConfig.start) * 1000)
                  : undefined,
              amountPerSecond: {
                amount: toBigIntString(eventConfig.amountPerSec),
                tokenAddress,
              },
              dripId: eventConfig.dripId.toString(),
              durationSeconds:
                eventConfig.duration > 0n
                  ? Number(eventConfig.duration)
                  : undefined,
            },
            isManaged: Boolean(matchingStream),
            receiver,
          });

          if (remainingStreamIds.includes(streamId)) {
            remainingStreamIds.splice(remainingStreamIds.indexOf(streamId), 1);
          }
        }

        /*
        If a particular stream doesn't appear within streamReceiverSeenEvents of a given
        streamsSet event, but did at least once before, we can assume it is paused.
        */
        for (const remainingStreamId of remainingStreamIds) {
          const stream = assetConfigMetadata?.streams.find(
            (s) => s.id === remainingStreamId,
          );
          if (!stream) break;

          const streamExistedBefore = assetConfigHistoryItems.find((item) =>
            item.streams.find((s) => s.streamId === remainingStreamId),
          );

          if (streamExistedBefore) {
            assetConfigHistoryItemStreams.push({
              streamId: remainingStreamId,
              // Undefined streamConfig == stream was paused
              config: undefined,
              isManaged: true,
              receiver: {
                ...(buildStreamReceiver(
                  stream.receiver.accountId as AddressDriverId,
                ) as AddressDriverAccount),
                address: getUserAddress(
                  stream.receiver.accountId as AddressDriverId,
                ),
              },
            });
          }
        }

        let runsOutOfFunds: Date | undefined;

        // If maxEnd is the largest possible timestamp, all current streams end before balance is depleted.
        if (BigInt(streamsSetEvent.maxEnd) === 2n ** 32n - 1n) {
          runsOutOfFunds = undefined;
        } else if (BigInt(streamsSetEvent.maxEnd) === 0n) {
          runsOutOfFunds = undefined;
        } else {
          runsOutOfFunds = new Date(Number(streamsSetEvent.maxEnd) * 1000);
        }

        assetConfigHistoryItems.push({
          timestamp: new Date(Number(streamsSetEvent.blockTimestamp)),
          balance: {
            tokenAddress,
            amount: toBigIntString(
              BigInt(streamsSetEvent.balance) * BigInt(AMT_PER_SEC_MULTIPLIER),
            ),
          },
          runsOutOfFunds,
          streams: assetConfigHistoryItemStreams,
          historyHash: streamsSetEvent.streamsHistoryHash,
          receiversHash: streamsSetEvent.receiversHash,
        });
      }

      const currentStreams =
        assetConfigHistoryItems[assetConfigHistoryItems.length - 1].streams;

      acc.push({
        tokenAddress,
        streams: currentStreams.map((receiver) =>
          mapReceiverToStream(
            receiver,
            accountId,
            tokenAddress,
            assetConfigMetadata,
          ),
        ),
        history: assetConfigHistoryItems,
      });

      return acc;
    },
    [],
  );
}
