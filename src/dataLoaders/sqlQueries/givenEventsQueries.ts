import { QueryTypes } from 'sequelize';
import { dbConnection } from '../../database/connectToDatabase';
import type { GiveWhereInput } from '../../generated/graphql';
import type { AccountId, DbSchema } from '../../common/types';
import type { GivenEventModelDataValues } from '../../given-event/GivenEventModel';
import GivenEventModel from '../../given-event/GivenEventModel';

async function getDistinctErc20ByReceiver(
  chains: DbSchema[],
  receiver: AccountId,
) {
  const baseSQL = (schema: DbSchema) =>
    `SELECT DISTINCT ON ("erc20") "erc20", '${schema}' AS chain FROM ${schema}.given_events`;

  const whereClause = ` WHERE "receiver" = :receiver`;

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  const fullQuery = `${queries.join(' UNION ')}`;

  return (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: { receiver },
      mapToModel: true,
      model: GivenEventModel,
    })
  ).map((p) => p.dataValues.erc20);
}

async function getGivenEventsByFilter(
  chains: DbSchema[],
  where: GiveWhereInput,
) {
  const baseSQL = (schema: DbSchema) =>
    `SELECT *, '${schema}' AS chain FROM ${schema}.given_events`;

  const conditions: string[] = [];
  const parameters: { [key: string]: any } = {};

  if (where?.receiverAccountId) {
    conditions.push(`"receiver" = :receiver`);
    parameters.receiver = where.receiverAccountId;
  }
  if (where?.senderAccountId) {
    conditions.push(`"account_id" = :accountId`);
    parameters.accountId = where.senderAccountId;
  }
  if (where?.tokenAddress) {
    conditions.push(`"erc20" = :erc20`);
    parameters.erc20 = where.tokenAddress;
  }

  const whereClause =
    conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')}`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: GivenEventModel,
    })
  ).map((p) => p.dataValues as GivenEventModelDataValues);
}

async function getGivenEventsByReceivers(
  chains: DbSchema[],
  receivers: AccountId[],
) {
  const baseSQL = (schema: DbSchema) =>
    `SELECT *, '${schema}' AS chain FROM ${schema}.given_events`;

  const parameters: { [key: string]: any } = { receivers };

  const whereClause = ` WHERE "receiver" IN (:receivers)`;

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')}`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: GivenEventModel,
    })
  ).map((p) => p.dataValues as GivenEventModelDataValues);
}

async function getGivenEventsByTxHashesAndLogIndex(
  chains: DbSchema[],
  transactionHashes: string[],
  logIndexes: number[],
) {
  const baseSQL = (schema: DbSchema) =>
    `SELECT *, '${schema}' AS chain FROM ${schema}.given_events`;

  const conditions: string[] = [
    'transaction_hash IN (:transactionHashes)',
    'log_index IN (:logIndexes)',
  ];
  const parameters: { [key: string]: any } = {
    transactionHashes,
    logIndexes,
  };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')}`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: GivenEventModel,
    })
  ).map((p) => p.dataValues as GivenEventModelDataValues);
}

async function getGivenEventsByReceiver(
  chains: DbSchema[],
  receiver: AccountId,
) {
  const baseSQL = (schema: DbSchema) =>
    `SELECT *, '${schema}' AS chain FROM ${schema}.given_events`;

  const parameters: { [receiver: string]: any } = { receiver };

  const whereClause = ` WHERE "receiver" = :receiver`;

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')}`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: GivenEventModel,
    })
  ).map((p) => p.dataValues as GivenEventModelDataValues);
}

export default {
  getByFilter: getGivenEventsByFilter,
  getByTxHashesAndLogIndex: getGivenEventsByTxHashesAndLogIndex,
  getByReceivers: getGivenEventsByReceivers,
  getByReceiver: getGivenEventsByReceiver,
  getDistinctErc20ByReceiver,
};
