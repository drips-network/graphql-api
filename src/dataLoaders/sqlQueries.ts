import { QueryTypes } from 'sequelize';
import { dbConnection } from '../database/connectToDatabase';
import type {
  GiveWhereInput,
  ProjectSortInput,
  ProjectWhereInput,
  SupportedChain,
} from '../generated/graphql';
import type { ProjectDataValues } from '../project/ProjectModel';
import ProjectModel from '../project/ProjectModel';
import type { AccountId } from '../common/types';
import type { SplitEventModelDataValues } from '../models/SplitEventModel';
import SplitEventModel from '../models/SplitEventModel';
import type { AddressDriverSplitReceiverModelDataValues } from '../models/AddressDriverSplitReceiverModel';
import AddressDriverSplitReceiverModel from '../models/AddressDriverSplitReceiverModel';
import type { GivenEventModelDataValues } from '../given-event/GivenEventModel';
import GivenEventModel from '../given-event/GivenEventModel';

async function getProjectsByFilter(
  chains: SupportedChain[],
  where?: ProjectWhereInput,
  sort?: ProjectSortInput,
): Promise<ProjectDataValues[]> {
  const baseSQL = (schema: SupportedChain) =>
    `SELECT 
      "id", "isValid", "name", "verificationStatus"::TEXT, "claimedAt", "forge"::TEXT, "ownerAddress", "ownerAccountId", "url", "emoji", "avatarCid", "color", "description", "createdAt", "updatedAt", '${schema}' AS chain 
     FROM "${schema}"."GitProjects" `;

  const conditions: string[] = [];
  const parameters: { [key: string]: any } = {};

  if (where?.id) {
    conditions.push(`"id" = :id`);
    parameters.id = where.id;
  }
  if (where?.ownerAddress) {
    conditions.push(`"ownerAddress" = :ownerAddress`);
    parameters.ownerAddress = where.ownerAddress;
  }
  if (where?.url) {
    conditions.push(`"url" = :url`);
    parameters.url = where.url;
  }
  if (where?.verificationStatus) {
    conditions.push(`"verificationStatus" = :verificationStatus`);
    parameters.verificationStatus = where.verificationStatus;
  }

  const whereClause =
    conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

  const orderClause = sort
    ? ` ORDER BY "${sort.field}" ${sort.direction || 'DESC'}`
    : '';

  const chainQueries = chains.map(
    (chain) => baseSQL(chain) + whereClause + orderClause,
  );

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: ProjectModel,
    })
  ).map((p) => p.dataValues as ProjectDataValues);
}

async function getSplitEventsByAccountIdAndReceiver(
  chains: SupportedChain[],
  accountId: AccountId,
  receiver: AccountId,
): Promise<SplitEventModelDataValues[]> {
  const baseSQL = (schema: SupportedChain) =>
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

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: SplitEventModel,
    })
  ).map((p) => p.dataValues as SplitEventModelDataValues);
}

async function getAddressDriverSplitReceiversByFundeeAccountIds(
  chains: SupportedChain[],
  fundeeAccountIds: AccountId[],
) {
  // Define base SQL to query from multiple chains (schemas).
  const baseSQL = (schema: SupportedChain) => `
  SELECT "id", "fundeeAccountId", "fundeeAccountAddress", "funderProjectId", "funderDripListId","weight", "type"::TEXT, "createdAt", "updatedAt", '${schema}' AS chain
  FROM "${schema}"."AddressDriverSplitReceivers"
`;

  const parameters: { [key: string]: any } = {
    fundeeAccountIds,
  };

  const whereClause = ` WHERE "fundeeAccountId" IN (:fundeeAccountIds)`;

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: AddressDriverSplitReceiverModel,
    })
  ).map((p) => p.dataValues as AddressDriverSplitReceiverModelDataValues);
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

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

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

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

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

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

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

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

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
  projects: {
    getProjectsByFilter,
  },
  events: {
    given: {
      getByFilter: getGivenEventsByFilter,
      getByTxHashesAndLogIndex: getGivenEventsByTxHashesAndLogIndex,
      getByReceivers: getGivenEventsByReceivers,
      getByReceiver: getGivenEventsByReceiver,
    },
    slit: {
      getByAccountIdAndReceiver: getSplitEventsByAccountIdAndReceiver,
    },
  },
  receivers: {
    getAddressDriverSplitReceiversByFundeeAccountIds,
  },
};
