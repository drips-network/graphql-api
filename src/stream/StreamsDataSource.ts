import { Op } from 'sequelize';
import type { AddressDriverId } from '../common/types';
import type {
  AddressDriverAccount,
  NftDriverAccount,
  Stream,
  StreamWhereInput,
} from '../generated/graphql';
import StreamReceiverSeenEventModel from '../models/StreamReceiverSeenEventModel';
import StreamsSetEventModel from '../models/StreamsSetEventModel';
import assert, { isAddressDriverId } from '../utils/assert';
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

    const streamsSetEventsWithMatchingHistoryHash =
      await StreamsSetEventModel.findAll({
        where: {
          receiversHash: {
            [Op.in]: streamReceiverSeenEventsForUser.map(
              (event) => event.receiversHash,
            ),
          },
        },
      });

    const accountIdsStreamingToUser = streamsSetEventsWithMatchingHistoryHash
      .map((event) => event.accountId)
      .filter((id, index, self) => self.indexOf(id) === index);

    const accountsStreamingToUser = await Promise.all(
      accountIdsStreamingToUser.map((id) => {
        assert(isAddressDriverId(id));
        return getUserAccount(id);
      }),
    );

    const incomingStreams = accountsStreamingToUser.reduce<Stream[]>(
      (acc, account) => {
        const streams = account.assetConfigs
          .flatMap((assetConfig) => assetConfig.streams)
          .filter(
            (stream) =>
              (
                stream.receiver as any as
                  | AddressDriverAccount
                  | NftDriverAccount
              ).accountId === accountId,
          );

        return [...acc, ...streams];
      },
      [],
    );

    return incomingStreams;
  }

  public async getStreamsByFilter(where: StreamWhereInput): Promise<Stream[]> {
    const streams: Stream[] = [];

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
