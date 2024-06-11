import { QueryTypes } from 'sequelize';
import type { AccountId } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { SupportedChain } from '../../generated/graphql';
import type { StreamsSetEventModelDataValues } from '../../models/StreamsSetEventModel';
import StreamsSetEventModel from '../../models/StreamsSetEventModel';

async function getDistinctErc20ByReceiversHashes(
  chains: SupportedChain[],
  receiversHashes: string[],
) {
  const baseSQL = (schema: SupportedChain) =>
    `SELECT DISTINCT ON ("erc20") "erc20", '${schema}' AS chain FROM "${schema}"."StreamsSetEvents"`;

  const whereClause = receiversHashes?.length
    ? ` WHERE "receiversHash" IN (:receiversHashes)`
    : '';

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
  chains: SupportedChain[],
  accountId: AccountId,
) {
  const baseSQL = (schema: SupportedChain) => `
    SELECT *, '${schema}' AS chain FROM "${schema}"."StreamsSetEvents"`;

  const parameters: { [key: string]: any } = { accountId };

  const whereClause = ` WHERE "accountId" = :accountId`;

  const orderClause = ' ORDER BY "blockNumber" ASC, "logIndex" ASC';

  const queries = chains.map(
    (chain) => `${baseSQL(chain) + whereClause + orderClause}`,
  );

  const fullQuery = `${queries.join(' UNION ')}`;

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
  chains: SupportedChain[],
  receiversHashes: string[],
) {
  const baseSQL = (schema: SupportedChain) =>
    `SELECT *, '${schema}' AS chain FROM "${schema}"."StreamsSetEvents"`;

  const whereClause = receiversHashes.length
    ? ` WHERE "receiversHash" IN (:receiversHashes)`
    : '';

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

export default {
  getByAccountIdSorted: getSortedStreamsSetEventsByAccountId,
  getByReceiversHashes: getSortedStreamsSetEventsByReceiversHashes,
  getDistinctErc20ByReceiversHashes,
};
