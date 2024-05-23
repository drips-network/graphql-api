import { Op } from 'sequelize';

import StreamReceiverSeenEventModel from '../models/StreamReceiverSeenEventModel';
import StreamsSetEventModel from '../models/StreamsSetEventModel';
import assert, { isAddressDriverId } from './assert';
import getUserAccount from './getUserAccount';
import type {
  AddressDriverAccount,
  NftDriverAccount,
} from '../generated/graphql';

import type { AccountId } from '../common/types';
import type { ProtoStream } from './buildAssetConfigs';

async function getUserIncomingStreams(
  accountId: AccountId,
): Promise<ProtoStream[]> {
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

  const incomingStreams = accountsStreamingToUser.reduce<ProtoStream[]>(
    (acc, account) => {
      const streams = account.assetConfigs
        .flatMap((assetConfig) => assetConfig.streams)
        .filter(
          (stream) =>
            (stream.receiver as any as AddressDriverAccount | NftDriverAccount)
              .accountId === accountId,
        );

      return [...acc, ...streams];
    },
    [],
  );

  return incomingStreams;
}

export default {
  getUserIncomingStreams,
};
