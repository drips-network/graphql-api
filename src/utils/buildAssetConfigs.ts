import assert from './assert';
import buildStreamReceiver, {
  makeStreamId,
  matchMetadataStreamToReceiver,
  mapReceiverToStream,
  fromUint256,
} from './streamUtils';
import type {
  AddressDriverAccount,
  NftDriverAccount,
} from '../generated/graphql';
import getUserAddress from './getUserAddress';
import type {
  AccountMetadata,
  AddressDriverId,
  DbSchema,
  StreamsSetEventWithReceivers,
} from '../common/types';
import { AMT_PER_SEC_MULTIPLIER } from '../common/constants';
import toBigIntString from './toBigIntString';

type Erc20 = string;

export interface AssetConfig {
  tokenAddress: Erc20;
  streams: ProtoStream[];
  history: AssetConfigHistoryItem[];
}

export interface AssetConfigHistoryItem {
  chain: DbSchema;
  timestamp: Date;
  balance: {
    tokenAddress: string;
    amount: string;
  };
  runsOutOfFunds: Date | undefined;
  streams: ProtoStream[];
  historyHash: string;
  receiversHash: string;
}

export interface ProtoStream {
  chain: DbSchema;
  streamId: string;
  config:
    | {
        raw: string;
        startDate: Date | undefined;
        amountPerSecond: {
          amount: string;
          tokenAddress: string;
        };
        dripId: string;
        durationSeconds: number | undefined;
      }
    | undefined;
  createdAt: Date | undefined;
  isManaged: boolean;
  receiver: AddressDriverAccount | NftDriverAccount;
  sender: AddressDriverAccount;
  endsAt: Date | undefined;
}

export default function buildAssetConfigs(
  accountId: AddressDriverId,
  accountMetadata: AccountMetadata | undefined,
  accountStreamsSetEvents: Map<Erc20, StreamsSetEventWithReceivers[]>,
  chain: DbSchema,
) {
  const firstAppearanceMap = new Map<string, Date>();

  return Array.from(accountStreamsSetEvents.entries()).reduce<AssetConfig[]>(
    (acc, [tokenAddress, assetConfigStreamsSetEvents]) => {
      const assetConfigMetadata = accountMetadata?.assetConfigs.find(
        (ac) => ac.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
      );

      assert(
        assetConfigStreamsSetEvents && assetConfigStreamsSetEvents.length > 0,
        `Unable to find 'StreamsSet' events for asset config with token address '${tokenAddress}' for account '${accountId}'.`,
      );

      const assetConfigHistoryItems: AssetConfigHistoryItem[] = [];

      for (const streamsSetEvent of assetConfigStreamsSetEvents) {
        const assetConfigHistoryItemStreams: ProtoStream[] = [];

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

          const eventDate = streamsSetEvent.blockTimestamp;
          const existingDate = firstAppearanceMap.get(streamId);
          if (!existingDate || eventDate < existingDate) {
            firstAppearanceMap.set(streamId, eventDate);
          }

          let endsAt: Date | undefined;
          const durationInMilliseconds = eventConfig.duration * BigInt(1000);
          const startTimeInMilliseconds = BigInt(
            streamsSetEvent.blockTimestamp.getTime(),
          );

          if (eventConfig.start) {
            if (eventConfig.duration) {
              endsAt = new Date(
                Number(startTimeInMilliseconds + durationInMilliseconds),
              );
            }
          } else if (eventConfig.duration) {
            const base = BigInt(streamsSetEvent.blockTimestamp.getTime());
            const end = base + durationInMilliseconds;
            endsAt = new Date(Number(end));
          }

          assetConfigHistoryItemStreams.push({
            chain,
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
            createdAt: firstAppearanceMap.get(streamId),
            isManaged: Boolean(matchingStream),
            receiver,
            sender: {
              ...(buildStreamReceiver(
                accountId as AddressDriverId,
              ) as AddressDriverAccount),
              address: getUserAddress(accountId as AddressDriverId),
            },
            endsAt,
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
              chain,
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
              sender: {
                ...(buildStreamReceiver(
                  accountId as AddressDriverId,
                ) as AddressDriverAccount),
                address: getUserAddress(accountId as AddressDriverId),
              },
              createdAt: firstAppearanceMap.get(remainingStreamId),
              endsAt: undefined,
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
          chain,
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
            chain,
            receiver,
            accountId,
            tokenAddress,
            assetConfigHistoryItems,
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
