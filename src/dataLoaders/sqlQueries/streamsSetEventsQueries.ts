import { QueryTypes } from 'sequelize';
import type { AccountId } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { SupportedChain } from '../../generated/graphql';
import type { StreamsSetEventModelDataValues } from '../../models/StreamsSetEventModel';
import StreamsSetEventModel from '../../models/StreamsSetEventModel';

async function getSortedStreamsSetEventsByAccountId(
  chains: SupportedChain[],
  accountId: AccountId,
) {
  const baseStreamsSetEventsSQL = (schema: SupportedChain) => `
    SELECT *, '${schema}' AS chain FROM "${schema}"."StreamsSetEvents"`;

  const streamsSetEventModelConditions: string[] = ['"accountId" = :accountId'];
  const streamsSetEventModelParameters: { [key: string]: any } = { accountId };

  const whereClause = ` WHERE ${streamsSetEventModelConditions.join(' AND ')}`;

  const orderClause = ' ORDER BY "blockNumber" ASC, "logIndex" ASC';

  const streamsSetEventModelDataValuesQueries = chains.map(
    (chain) => `${baseStreamsSetEventsSQL(chain) + whereClause + orderClause}`,
  );

  const fullQueryStreamsSetEventModelQuery = `${streamsSetEventModelDataValuesQueries.join(
    ' UNION ',
  )} LIMIT 1000`;

  return (
    await dbConnection.query(fullQueryStreamsSetEventModelQuery, {
      type: QueryTypes.SELECT,
      replacements: streamsSetEventModelParameters,
      mapToModel: true,
      model: StreamsSetEventModel,
    })
  ).map((p) => p.dataValues as StreamsSetEventModelDataValues);
}

async function getSortedStreamsSetEventsByReceiversHashes(
  chains: SupportedChain[],
  receiversHashes: string[],
) {
  const baseSQL = (schema: SupportedChain) =>
    `SELECT *, '${schema}' AS chain FROM "${schema}"."StreamsSetEvents"`;

  const whereClause = receiversHashes.length
    ? ` WHERE "receiversHash" IN (:receiversHashes)`
    : '';

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

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

export default {
  getByAccountIdSorted: getSortedStreamsSetEventsByAccountId,
  getByReceiversHashes: getSortedStreamsSetEventsByReceiversHashes,
};
