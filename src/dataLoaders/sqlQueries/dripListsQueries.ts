import { QueryTypes } from 'sequelize';
import type { DbSchema, NftDriverId } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { DripListDataValues } from '../../drip-list/DripListModel';
import DripListModel from '../../drip-list/DripListModel';
import type { DripListWhereInput } from '../../generated/graphql';

async function getDripListsByFilter(
  chains: DbSchema[],
  where?: DripListWhereInput,
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT *, '${schema}' AS chain FROM ${schema}.drip_lists
  `;

  const conditions: string[] = ['is_valid = true', 'name IS NOT NULL'];
  const parameters: { [key: string]: any } = {};

  if (where?.accountId) {
    conditions.push(`account_id = :accountId`);
    parameters.accountId = where.accountId;
  }
  if (where?.ownerAddress) {
    conditions.push(`owner_address = :ownerAddress`);
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
  dripListIds: NftDriverId[],
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT *, '${schema}' AS chain FROM ${schema}.drip_lists`;

  const conditions: string[] = [
    'account_id IN (:dripListIds)',
    'is_valid = true',
  ];
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
