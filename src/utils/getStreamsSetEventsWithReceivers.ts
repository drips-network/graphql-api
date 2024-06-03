import { QueryTypes } from 'sequelize';
import type {
  AddressDriverId,
  StreamsSetEventWithReceivers,
} from '../common/types';
import type { StreamReceiverSeenEventModelDataValues } from '../models/StreamReceiverSeenEventModel';
import StreamReceiverSeenEventModel from '../models/StreamReceiverSeenEventModel';
import type { StreamsSetEventModelDataValues } from '../models/StreamsSetEventModel';
import StreamsSetEventModel from '../models/StreamsSetEventModel';
import type { SupportedChain } from '../generated/graphql';
import { dbConnection } from '../database/connectToDatabase';

export default async function getStreamsSetEventsWithReceivers(
  chains: SupportedChain[],
  accountId: AddressDriverId,
): Promise<StreamsSetEventWithReceivers[]> {
  const baseStreamsSetEventsSQL = (schema: SupportedChain) => `
    SELECT *, '${schema}' AS chain FROM "${schema}"."StreamsSetEvents"`;

  // Initialize the WHERE clause parts.
  const streamsSetEventModelConditions: string[] = ['"accountId" = :accountId'];
  const streamsSetEventModelParameters: { [key: string]: any } = { accountId };

  // Build the where clause.
  const whereClause = ` WHERE ${streamsSetEventModelConditions.join(' AND ')}`;

  // Define the order.
  const orderClause = ' ORDER BY "blockNumber" ASC, "logIndex" ASC';

  // Build the SQL for each specified schema.
  const streamsSetEventModelDataValuesQueries = chains.map(
    (chain) => `${baseStreamsSetEventsSQL(chain) + whereClause + orderClause}`,
  );

  // Combine all schema queries with UNION.
  const fullQueryStreamsSetEventModelQuery = `${streamsSetEventModelDataValuesQueries.join(
    ' UNION ',
  )} LIMIT 1000`;

  const sortedAccountStreamSetEventModelDataValues = (
    await dbConnection.query(fullQueryStreamsSetEventModelQuery, {
      type: QueryTypes.SELECT,
      replacements: streamsSetEventModelParameters,
      mapToModel: true,
      model: StreamsSetEventModel,
    })
  ).map((p) => p.dataValues as StreamsSetEventModelDataValues);

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
  )} LIMIT 1000`;

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
