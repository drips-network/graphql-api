import type { AddressDriverId } from '../common/types';
import type { Stream, StreamWhereInput } from '../generated/graphql';
import StreamReceiverSeenEventModel from '../models/StreamReceiverSeenEventModel';
import { assertIsAddressDriverId } from '../utils/assert';
import getUserAccount from '../utils/getUserAccount';

export default class StreamsDataSource {
  public async getUserOutgoingStreams(
    accountId: AddressDriverId,
  ): Promise<Stream[]> {
    const userAccount = await getUserAccount(accountId);

    return userAccount.assetConfigs.flatMap(
      (assetConfig) => assetConfig.streams,
    );
  }

  public async getUserIncomingStreams(
    accountId: AddressDriverId,
  ): Promise<Stream[]> {
    const streamReceiverSeenEventsForUser =
      await StreamReceiverSeenEventModel.findAll({
        where: {
          accountId,
        },
      });
    const accountIdsStreamingToUser = streamReceiverSeenEventsForUser.reduce<
      string[]
    >((acc, event) => {
      const receiverId = event.accountId.toString();
      return !acc.includes(receiverId) ? [...acc, receiverId] : acc;
    }, []);

    const accountsStreamingToUser = await Promise.all(
      accountIdsStreamingToUser.map((id) => {
        assertIsAddressDriverId(id);
        return getUserAccount(id);
      }),
    );

    const incomingStreams = accountsStreamingToUser.reduce<Stream[]>(
      (acc, account) => {
        const streams = account.assetConfigs
          .flatMap((assetConfig) => assetConfig.streams)
          .filter((stream) => stream.receiver.accountId === accountId);

        return [...acc, ...streams];
      },
      [],
    );

    return incomingStreams;
  }

  public async getStreamsByFilter(where: StreamWhereInput): Promise<Stream[]> {
    const streams: Stream[] = [];

    if (where.senderId) {
      assertIsAddressDriverId(where.senderId);

      const senderOutgoingStreams = await this.getUserOutgoingStreams(
        where.senderId,
      );

      streams.push(...senderOutgoingStreams);
    }

    if (where.receiverId) {
      assertIsAddressDriverId(where.receiverId);

      const receiverIncomingStreams = await this.getUserIncomingStreams(
        where.receiverId,
      );

      streams.push(...receiverIncomingStreams);
    }

    return streams;
  }
}
