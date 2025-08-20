import { QueryTypes } from 'sequelize';
import type {
  AccountId,
  AddressDriverId,
  DbSchema,
  StreamsSetEventWithReceivers,
} from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { StreamsSetEventModelDataValues } from '../../models/StreamsSetEventModel';
import StreamsSetEventModel from '../../models/StreamsSetEventModel';
import type { StreamReceiverSeenEventModelDataValues } from '../../models/StreamReceiverSeenEventModel';
import StreamReceiverSeenEventModel from '../../models/StreamReceiverSeenEventModel';

// TODO: Investigate queries and add DataLoader if needed.
async function getDistinctErc20ByReceiversHashes(
  chains: DbSchema[],
  receiversHashes: string[],
) {
  if (!receiversHashes?.length) {
    return [];
  }

  const baseSQL = (schema: DbSchema) =>
    `SELECT DISTINCT ON ("erc20") "erc20", '${schema}' AS chain FROM ${schema}.streams_set_events`;

  const whereClause = ` WHERE "receivers_hash" IN (:receiversHashes)`;

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  const fullQuery = `${queries.join(' UNION ')}`;

  return (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: { receiversHashes },
      mapToModel: true,
      model: StreamsSetEventModel,
    })
  ).map((p) => p.dataValues.erc20);
}

async function getSortedStreamsSetEventsByAccountId(
  chains: DbSchema[],
  accountId: AccountId,
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT *, '${schema}' AS chain FROM ${schema}.streams_set_events`;

  const parameters: { [key: string]: any } = { accountId };

  const whereClause = ` WHERE "account_id" = :accountId`;

  const orderClause = ' ORDER BY block_number ASC, "log_index" ASC';

  const queries = chains.map((chain) => `${baseSQL(chain) + whereClause}`);

  const fullQuery = `${queries.join(' UNION ')}${orderClause}`;

  return (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: StreamsSetEventModel,
    })
  ).map((p) => p.dataValues as StreamsSetEventModelDataValues);
}

async function getSortedStreamsSetEventsByReceiversHashes(
  chains: DbSchema[],
  receiversHashes: string[],
) {
  if (!receiversHashes?.length) {
    return [];
  }

  const baseSQL = (schema: DbSchema) =>
    `SELECT *, '${schema}' AS chain FROM ${schema}.streams_set_events`;

  const whereClause = ` WHERE "receivers_hash" IN (:receiversHashes)`;

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  const fullQuery = `${queries.join(' UNION ')}`;

  return (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: {
        receiversHashes,
      },
      mapToModel: true,
      model: StreamsSetEventModel,
    })
  ).map((p) => p.dataValues as StreamsSetEventModelDataValues);
}

async function getStreamsSetEventsWithReceivers(
  chains: DbSchema[],
  accountId: AddressDriverId,
): Promise<StreamsSetEventWithReceivers[]> {
  const sortedAccountStreamSetEventModelDataValues =
    await getSortedStreamsSetEventsByAccountId(chains, accountId);

  const uniqueReceiversHashes = [
    ...new Set(
      sortedAccountStreamSetEventModelDataValues.map(
        (event) => event.receiversHash,
      ),
    ),
  ];

  const baseSQL = (schema: DbSchema) => `
    SELECT *, '${schema}' AS chain FROM ${schema}.stream_receiver_seen_events`;

  const conditions: string[] = ['receivers_hash IN (:uniqueReceiversHashes)'];
  const parameters: { [key: string]: any } = {
    uniqueReceiversHashes,
  };

  const whereClause = uniqueReceiversHashes?.length
    ? ` WHERE ${conditions.join(' AND ')}`
    : '';

  const queries = chains.map((chain) => `${baseSQL(chain) + whereClause}`);

  const fullQuery = `${queries.join(' UNION ')}`;

  const streamReceiverSeenEventModelDataValues = (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
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

export default {
  getByAccountIdSorted: getSortedStreamsSetEventsByAccountId,
  getByReceiversHashes: getSortedStreamsSetEventsByReceiversHashes,
  getDistinctErc20ByReceiversHashes,
  getStreamsSetEventsWithReceivers,
};
