import { QueryTypes } from 'sequelize';
import type { AccountId, DbSchema } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { SplitEventModelDataValues } from '../../models/SplitEventModel';
import SplitEventModel from '../../models/SplitEventModel';

async function getDistinctErc20ByReceiver(
  chains: DbSchema[],
  receiver: AccountId,
) {
  const baseSQL = (schema: DbSchema) =>
    `SELECT DISTINCT ON ("erc20") "erc20", '${schema}' AS chain FROM "${schema}"."SplitEvents"`;

  const whereClause = ` WHERE "receiver" = :receiver`;

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  const fullQuery = `${queries.join(' UNION ')}`;

  return (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: { receiver },
      mapToModel: true,
      model: SplitEventModel,
    })
  ).map((p) => p.dataValues.erc20);
}

async function getSplitEventsByAccountIdAndReceiver(
  chains: DbSchema[],
  accountId: AccountId,
  receiver: AccountId,
): Promise<SplitEventModelDataValues[]> {
  const baseSQL = (schema: DbSchema) =>
    `SELECT *, '${schema}' AS chain FROM "${schema}"."SplitEvents"`;

  const conditions: string[] = [
    '"accountId" = :accountId',
    '"receiver" = :receiver',
  ];
  const parameters: { [receiver: string]: any } = {
    accountId,
    receiver,
  };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')}`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: SplitEventModel,
    })
  ).map((p) => p.dataValues as SplitEventModelDataValues);
}

async function getSplitEventsByReceiver(
  chains: DbSchema[],
  receiver: AccountId,
): Promise<SplitEventModelDataValues[]> {
  const baseSQL = (schema: DbSchema) =>
    `SELECT *, '${schema}' AS chain FROM "${schema}"."SplitEvents"`;

  const conditions: string[] = ['"receiver" = :receiver'];
  const parameters: { [receiver: string]: any } = { receiver };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  const fullQuery = `${queries.join(' UNION ')}`;

  return (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: SplitEventModel,
    })
  ).map((p) => p.dataValues as SplitEventModelDataValues);
}

async function getSplitEventsByProjectReceivers(
  chains: DbSchema[],
  accountIds: AccountId[],
): Promise<SplitEventModelDataValues[]> {
  const baseSplitEventsSQL = (schema: DbSchema) =>
    `SELECT "accountId", "receiver", "erc20", "amt", "transactionHash", "logIndex", "blockTimestamp", "blockNumber", "createdAt", "updatedAt", '${schema}' AS chain FROM "${schema}"."SplitEvents"`;

  const conditions: string[] = [`"receiver" IN (:receivers)`];
  const parameters: { [key: string]: any } = {
    receivers: accountIds,
  };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const splitsQueries = chains.map(
    (chain) => baseSplitEventsSQL(chain) + whereClause,
  );

  const fullSplitsQuery = `${splitsQueries.join(' UNION ')}`;

  return (
    await dbConnection.query(fullSplitsQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: SplitEventModel,
    })
  ).map((p) => p.dataValues as SplitEventModelDataValues);
}

export default {
  getByAccountIdAndReceiver: getSplitEventsByAccountIdAndReceiver,
  getByReceiver: getSplitEventsByReceiver,
  getByProjectReceivers: getSplitEventsByProjectReceivers,
  getDistinctErc20ByReceiver,
};
