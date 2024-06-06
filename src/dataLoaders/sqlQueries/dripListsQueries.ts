import { QueryTypes } from 'sequelize';
import type { DripListId } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { DripListDataValues } from '../../drip-list/DripListModel';
import DripListModel from '../../drip-list/DripListModel';
import type {
  DripListWhereInput,
  SupportedChain,
} from '../../generated/graphql';

async function getDripListsByFilter(
  chains: SupportedChain[],
  where: DripListWhereInput,
) {
  // Define base SQL to query from multiple chains (schemas).
  const baseSQL = (schema: SupportedChain) => `
    SELECT "id", "isValid", "name", "creator", "description", "ownerAddress", "ownerAccountId", "latestVotingRoundId", "previousOwnerAddress", "createdAt", "updatedAt", '${schema}' AS chain
    FROM "${schema}"."DripLists"
  `;

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

  const whereClause =
    conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: DripListModel,
    })
  ).map((p) => p.dataValues as DripListDataValues);
}

async function getDripListsByIds(
  chains: SupportedChain[],
  dripListIds: DripListId[],
) {
  const baseSQL = (schema: SupportedChain) => `
    SELECT "id", "isValid", "ownerAddress", "ownerAccountId", "name", "latestVotingRoundId", "description", "creator", "previousOwnerAddress", "createdAt", "updatedAt", '${schema}' AS chain
    FROM "${schema}"."DripLists"
  `;

  const conditions: string[] = ['"id" IN (:dripListIds)', '"isValid" = true'];
  const parameters: { [key: string]: any } = { dripListIds };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: DripListModel,
    })
  ).map((p) => p.dataValues as DripListDataValues);
}

export default {
  getByIds: getDripListsByIds,
  getByFilter: getDripListsByFilter,
};
