import { Op } from 'sequelize';
import type {
  AddressDriverId,
  StreamsSetEventWithReceivers,
} from '../common/types';
import StreamReceiverSeenEventModel from '../models/StreamReceiverSeenEventModel';
import StreamsSetEventModel from '../models/StreamsSetEventModel';

export default async function getStreamsSetEventsWithReceivers(
  accountId: AddressDriverId,
): Promise<StreamsSetEventWithReceivers[]> {
  const sortedAccountStreamSetEvents = await StreamsSetEventModel.findAll({
    where: { accountId },
    order: [
      // Oldest first
      ['blockNumber', 'ASC'],
      ['logIndex', 'ASC'],
    ],
  });

  const uniqueReceiversHashes = [
    ...new Set(
      sortedAccountStreamSetEvents.map((event) => event.receiversHash),
    ),
  ];

  const streamReceiverSeenEventsByReceiversHash =
    await StreamReceiverSeenEventModel.findAll({
      where: {
        receiversHash: {
          [Op.in]: uniqueReceiversHashes,
        },
      },
    }).then((events) => {
      // Group receivers by their hash
      const receiversGroupedByHash = events.reduce<{
        [receiversHash: string]: StreamReceiverSeenEventModel[];
      }>((acc, receiver) => {
        if (!acc[receiver.receiversHash]) {
          acc[receiver.receiversHash] = [];
        }
        acc[receiver.receiversHash].push(receiver);
        return acc;
      }, {});

      Object.keys(receiversGroupedByHash).forEach((hash) => {
        receiversGroupedByHash[hash] = [
          ...new Map(
            receiversGroupedByHash[hash].map((receiver) => [
              receiver.config,
              receiver,
            ]),
          ).values(),
        ];
      });

      return receiversGroupedByHash;
    });

  const streamsSetEventsWithReceivers = sortedAccountStreamSetEvents.reduce<
    StreamsSetEventWithReceivers[]
  >(
    (acc, streamsSetEvent) => [
      ...acc,
      {
        accountId: streamsSetEvent.accountId,
        erc20: streamsSetEvent.erc20,
        receiversHash: streamsSetEvent.receiversHash,
        streamsHistoryHash: streamsSetEvent.streamsHistoryHash,
        balance: streamsSetEvent.balance,
        maxEnd: streamsSetEvent.maxEnd,
        blockTimestamp: streamsSetEvent.blockTimestamp,
        receivers:
          streamReceiverSeenEventsByReceiversHash[
            streamsSetEvent.receiversHash
          ] || [],
      },
    ],
    [],
  );

  return streamsSetEventsWithReceivers;
}
