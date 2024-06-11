import { QueryTypes } from 'sequelize';
import { dbConnection } from '../../database/connectToDatabase';
import type { GiveWhereInput, SupportedChain } from '../../generated/graphql';
import type { AccountId } from '../../common/types';
import type { GivenEventModelDataValues } from '../../given-event/GivenEventModel';
import GivenEventModel from '../../given-event/GivenEventModel';

async function getDistinctErc20ByReceiver(
  chains: SupportedChain[],
  receiver: AccountId,
) {
  const baseSQL = (schema: SupportedChain) =>
    `SELECT DISTINCT ON ("erc20") "erc20", '${schema}' AS chain FROM "${schema}"."GivenEvents"`;

  const whereClause = ` WHERE "accountId" = :receiver`;

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
  chains: SupportedChain[],
  where: GiveWhereInput,
) {
  const baseSQL = (schema: SupportedChain) =>
    `SELECT *, '${schema}' AS chain FROM "${schema}"."GivenEvents"`;

  const conditions: string[] = [];
  const parameters: { [key: string]: any } = {};

  if (where?.receiverAccountId) {
    conditions.push(`"receiver" = :receiver`);
    parameters.receiver = where.receiverAccountId;
  }
  if (where?.senderAccountId) {
    conditions.push(`"accountId" = :accountId`);
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
  chains: SupportedChain[],
  receivers: AccountId[],
) {
  const baseSQL = (schema: SupportedChain) =>
    `SELECT *, '${schema}' AS chain FROM "${schema}"."GivenEvents"`;

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
  chains: SupportedChain[],
  transactionHashes: string[],
  logIndexes: number[],
) {
  const baseSQL = (schema: SupportedChain) =>
    `SELECT *, '${schema}' AS chain FROM "${schema}"."GivenEvents"`;

  const conditions: string[] = [
    '"transactionHash" IN (:transactionHashes)',
    '"logIndex" IN (:logIndexes)',
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
  chains: SupportedChain[],
  receiver: AccountId,
) {
  const baseSQL = (schema: SupportedChain) =>
    `SELECT *, '${schema}' AS chain FROM "${schema}"."GivenEvents"`;

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
