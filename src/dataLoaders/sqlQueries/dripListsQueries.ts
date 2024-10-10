import { QueryTypes } from 'sequelize';
import type { DbSchema, DripListId } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { DripListDataValues } from '../../drip-list/DripListModel';
import DripListModel from '../../drip-list/DripListModel';
import type { DripListWhereInput } from '../../generated/graphql';

async function getDripListsByFilter(
  chains: DbSchema[],
  where?: DripListWhereInput,
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT "id", "isValid", "name", "creator", "description", "ownerAddress", "ownerAccountId", "latestVotingRoundId", "previousOwnerAddress", "createdAt", "updatedAt", '${schema}' AS chain
    FROM "${schema}"."DripLists"
  `;

  const conditions: string[] = ['"isValid" = true', 'name IS NOT NULL'];
  const parameters: { [key: string]: any } = {};

  if (where?.id) {
    conditions.push(`"id" = :id`);
    parameters.id = where.id;
  }
  if (where?.ownerAddress) {
    conditions.push(`"ownerAddress" = :ownerAddress`);
    parameters.ownerAddress = where.ownerAddress;
  }

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

async function getDripListsByIds(
  chains: DbSchema[],
  dripListIds: DripListId[],
) {
  const baseSQL = (schema: DbSchema) => `
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
