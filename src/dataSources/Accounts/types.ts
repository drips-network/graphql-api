import type { AnyVersion } from '@efstajas/versioned-parser';
import type StreamReceiverSeenEventModel from '../../models/StreamReceiverSeenEventModel';
import type StreamsSetEventModel from '../../models/StreamsSetEventModel';
import type { addressDriverAccountMetadataParser } from '../../schemas';

export type StreamsSetEventWithReceivers = Pick<
  StreamsSetEventModel,
  | 'accountId'
  | 'erc20'
  | 'receiversHash'
  | 'streamsHistoryHash'
  | 'balance'
  | 'maxEnd'
  | 'blockTimestamp'
> & {
  receivers: Pick<
    StreamReceiverSeenEventModel,
    'receiversHash' | 'accountId' | 'config'
  >[];
};

export type AccountMetadata = AnyVersion<
  typeof addressDriverAccountMetadataParser
>;
export type AssetConfigMetadata = AccountMetadata['assetConfigs'][number];
