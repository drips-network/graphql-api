import { QueryTypes } from 'sequelize';
import type {
  AddressDriverId,
  StreamsSetEventWithReceivers,
} from '../common/types';
import type { StreamReceiverSeenEventModelDataValues } from '../models/StreamReceiverSeenEventModel';
import StreamReceiverSeenEventModel from '../models/StreamReceiverSeenEventModel';
import type { SupportedChain } from '../generated/graphql';
import { dbConnection } from '../database/connectToDatabase';
import streamsSetEventsQueries from '../dataLoaders/sqlQueries/streamsSetEventsQueries';

export default async function getStreamsSetEventsWithReceivers(
  chains: SupportedChain[],
  accountId: AddressDriverId,
): Promise<StreamsSetEventWithReceivers[]> {
  const sortedAccountStreamSetEventModelDataValues =
    await streamsSetEventsQueries.getByAccountIdSorted(chains, accountId);

  const uniqueReceiversHashes = [
    ...new Set(
      sortedAccountStreamSetEventModelDataValues.map(
        (event) => event.receiversHash,
      ),
    ),
  ];

  // Define base SQL to query from multiple chains (schemas).
  const baseStreamReceiverSeenEventModelSQL = (schema: SupportedChain) => `
    SELECT *, '${schema}' AS chain FROM "${schema}"."StreamReceiverSeenEvents"`;

  // Initialize the WHERE clause parts.
  const streamReceiverSeenEventModelConditions: string[] = [
    '"receiversHash" IN (:uniqueReceiversHashes)',
  ];
  const streamReceiverSeenEventModelParameters: { [key: string]: any } = {
    uniqueReceiversHashes,
  };

  // Build the where clause.
  const streamReceiverSeenEventModelWhereClause = ` WHERE ${streamReceiverSeenEventModelConditions.join(
    ' AND ',
  )}`;

  // Build the SQL for each specified schema.
  const streamReceiverSeenEventModelQueries = chains.map(
    (chain) =>
      `${
        baseStreamReceiverSeenEventModelSQL(chain) +
        streamReceiverSeenEventModelWhereClause
      }`,
  );

  // Combine all schema queries with UNION.
  const fullQueryStreamReceiverSeenEventModelQuery = `${streamReceiverSeenEventModelQueries.join(
    ' UNION ',
  )}`;

  const streamReceiverSeenEventModelDataValues = (
    await dbConnection.query(fullQueryStreamReceiverSeenEventModelQuery, {
      type: QueryTypes.SELECT,
      replacements: streamReceiverSeenEventModelParameters,
      mapToModel: true,
      model: StreamReceiverSeenEventModel,
    })
  ).map((p) => p.dataValues as StreamReceiverSeenEventModelDataValues);

  const receiversGroupedByHash = streamReceiverSeenEventModelDataValues.reduce<{
    [receiversHash: string]: StreamReceiverSeenEventModelDataValues[];
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

  const streamsSetEventsWithReceivers =
    sortedAccountStreamSetEventModelDataValues.reduce<
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
            receiversGroupedByHash[streamsSetEvent.receiversHash] || [],
        },
      ],
      [],
    );

  return streamsSetEventsWithReceivers;
}
