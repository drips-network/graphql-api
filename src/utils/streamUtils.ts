/* eslint-disable no-bitwise */
import { isAddress } from 'ethers';
import type { AnyVersion } from '@efstajas/versioned-parser';
import type { addressDriverAccountMetadataParser } from '../schemas';
import type {
  AccountId,
  AddressDriverId,
  AssetConfigMetadata,
  BigIntString,
  DbSchema,
} from '../common/types';
import { Driver } from '../generated/graphql';
import type {
  NftDriverAccount,
  AddressDriverAccount,
  StreamConfig,
} from '../generated/graphql';
import getContractNameByAccountId from './getContractNameByAccountId';
import getUserAddress from './getUserAddress';
import toBigIntString from './toBigIntString';
import assert from './assert';
import { streamTotalStreamedTimeline } from '../balances/estimate-reloaded';
import type { AssetConfigHistoryItem, ProtoStream } from './buildAssetConfigs';

const numericTest = /^\d+$/;

export function makeStreamId(
  senderAccountId: string,
  tokenAddress: string,
  dripId: string,
) {
  if (
    !(
      numericTest.test(senderAccountId) &&
      numericTest.test(dripId) &&
      isAddress(tokenAddress)
    )
  ) {
    throw new Error('Invalid values');
  }

  return `${senderAccountId}-${tokenAddress.toLowerCase()}-${dripId}`;
}

export const fromUint256 = (streamConfig: bigint | string) => {
  // eslint-disable-next-line no-param-reassign
  streamConfig = BigInt(streamConfig);

  const mask160 = (BigInt(1) << BigInt(160)) - BigInt(1);
  const mask32 = (BigInt(1) << BigInt(32)) - BigInt(1);

  const dripId = streamConfig >> BigInt(160 + 32 + 32);

  const amountPerSec = (streamConfig >> BigInt(32 + 32)) & mask160;

  const start = (streamConfig >> BigInt(32)) & mask32;

  const duration = streamConfig & mask32;

  const config = {
    dripId,
    amountPerSec,
    duration,
    start,
  };

  return config;
};

type StreamMetadata = AnyVersion<
  typeof addressDriverAccountMetadataParser
>['assetConfigs'][number]['streams'][number];

export function matchMetadataStreamToReceiver(
  receiverSeenEvent: { accountId: string; config: BigIntString },
  metadataStreams: StreamMetadata[],
): StreamMetadata | undefined {
  const results = metadataStreams.filter(
    (stream) =>
      stream.initialDripsConfig.dripId ===
      fromUint256(receiverSeenEvent.config).dripId.toString(),
  );

  if (results.length > 1) {
    throw new Error(
      'Metadata stream object somehow matches multiple on-chain receivers.',
    );
  }

  return results[0];
}

export default function buildStreamReceiver(
  receiverAccountId: AccountId,
): AddressDriverAccount | NftDriverAccount {
  const receiverDriver = getContractNameByAccountId(receiverAccountId);

  switch (receiverDriver) {
    case 'addressDriver':
      return {
        driver: Driver.ADDRESS,
        address: getUserAddress(receiverAccountId as AddressDriverId),
        accountId: receiverAccountId,
      };
    case 'nftDriver':
      return {
        driver: Driver.NFT,
        accountId: receiverAccountId,
      };
    default:
      throw new Error(
        `Unsupported stream receiver driver type: '${receiverDriver}'.`,
      );
  }
}

export function mapReceiverToStream(
  chain: DbSchema,
  receiver: ProtoStream,
  senderAccountId: string,
  tokenAddress: string,
  historyItems: AssetConfigHistoryItem[],
  assetConfigMetadata?: AssetConfigMetadata,
): any {
  const streamMetadata = assetConfigMetadata?.streams.find(
    (s) => s.id.toLowerCase() === receiver.streamId.toLowerCase(),
  );
  const initialDripsConfig = streamMetadata?.initialDripsConfig;

  const streamConfig: StreamConfig | undefined =
    receiver.config ||
    (initialDripsConfig && {
      dripId: initialDripsConfig.dripId,
      raw: initialDripsConfig.raw,
      amountPerSecond: {
        amount: toBigIntString(initialDripsConfig.amountPerSecond),
        tokenAddress,
      },
      startDate:
        initialDripsConfig.startTimestamp &&
        initialDripsConfig.startTimestamp > 0
          ? new Date(initialDripsConfig.startTimestamp * 1000)
          : undefined,
      durationSeconds:
        initialDripsConfig.durationSeconds !== 0
          ? initialDripsConfig.durationSeconds
          : undefined,
    });

  assert(
    streamConfig,
    'Both stream metadata and on-chain data cannot have an undefined streamConfig',
  );

  return {
    chain,
    id: receiver.streamId,
    sender: {
      driver: Driver.ADDRESS,
      accountId: senderAccountId,
      address: getUserAddress(senderAccountId as AddressDriverId),
    } as AddressDriverAccount,
    receiver: receiver.receiver,
    config: streamConfig,
    isPaused: !receiver.config,
    isManaged: Boolean(streamMetadata),
    name: streamMetadata?.name,
    description: streamMetadata?.description,
    isArchived: streamMetadata?.archived ?? false,
    timeline: streamTotalStreamedTimeline(receiver.streamId, historyItems),
    createdAt: receiver.createdAt,
    endsAt: receiver.endsAt,
  };
}
