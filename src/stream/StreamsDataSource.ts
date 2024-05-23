import type { AddressDriverId } from '../common/types';
import type { StreamWhereInput } from '../generated/graphql';
import assert, { isAddressDriverId } from '../utils/assert';
import type { ProtoStream } from '../utils/buildAssetConfigs';
import getUserAccount from '../utils/getUserAccount';
import streamsUtils from '../utils/streams';

export default class StreamsDataSource {
  public async getUserOutgoingStreams(accountId: AddressDriverId) {
    const userAccount = await getUserAccount(accountId);

    return userAccount.assetConfigs.flatMap(
      (assetConfig) => assetConfig.streams,
    );
  }

  public async getUserIncomingStreams(accountId: AddressDriverId) {
    return streamsUtils.getUserIncomingStreams(accountId);
  }

  public async getStreamsByFilter(where: StreamWhereInput) {
    const streams: ProtoStream[] = [];

    if (!where.senderId && !where.receiverId) {
      throw new Error(
        'At least one of senderId or receiverId must be provided.',
      );
    }

    if (where.senderId) {
      assert(isAddressDriverId(where.senderId));

      const senderOutgoingStreams = await this.getUserOutgoingStreams(
        where.senderId,
      );

      streams.push(...senderOutgoingStreams);
    }

    if (where.receiverId) {
      assert(isAddressDriverId(where.receiverId));

      const receiverIncomingStreams = await this.getUserIncomingStreams(
        where.receiverId,
      );

      streams.push(...receiverIncomingStreams);
    }

    return streams;
  }
}
