import { QueryTypes } from 'sequelize';
import type { DbSchema, NftDriverId } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { DripListDataValues } from '../../drip-list/DripListModel';
import DripListModel from '../../drip-list/DripListModel';
import type {
  DripListWhereInput,
  DripListSortInput,
} from '../../generated/graphql';

async function getDripListsByFilter(
  chains: DbSchema[],
  where?: DripListWhereInput,
  sort?: DripListSortInput,
  limit?: number,
) {
  const baseSQL = (schema: DbSchema) => {
    if (sort?.field === 'mintedAt') {
      return `
        WITH mint_events AS (
          SELECT DISTINCT ON ("token_id") 
            "token_id", 
            "block_timestamp" as "mintedAt"
          FROM "${schema}"."transfer_events" 
          WHERE "from" = '0x0000000000000000000000000000000000000000'
          ORDER BY "token_id", "block_timestamp" ASC
        )
        SELECT dl."account_id", dl."is_valid", dl."is_visible", dl."name", dl."creator", dl."description", dl."owner_address", dl."owner_account_id", dl."latest_voting_round_id", dl."previous_owner_address", dl."created_at", dl."updated_at", '${schema}' AS chain
        FROM "${schema}"."drip_lists" dl
        INNER JOIN mint_events me ON dl."account_id" = me."token_id"
      `;
    }
    return `
      SELECT "account_id", "is_valid", "is_visible", "name", "creator", "description", "owner_address", "owner_account_id", "latest_voting_round_id", "previous_owner_address", "created_at", "updated_at", '${schema}' AS chain
      FROM "${schema}"."drip_lists"
    `;
  };

  const conditions: string[] = ['is_valid = true', 'name IS NOT NULL'];
  const parameters: { [key: string]: any } = {};

  if (where?.accountId) {
    conditions.push(`account_id = :accountId`);
    parameters.accountId = where.accountId;
  }
  if (where?.ownerAddress) {
    conditions.push(`LOWER(owner_address) = LOWER(:ownerAddress)`);
    parameters.ownerAddress = where.ownerAddress;
  }

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const orderClause =
    sort?.field === 'mintedAt'
      ? ` ORDER BY me."mintedAt" ${sort.direction || 'DESC'}`
      : '';

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const limitValue = Math.min(Math.max(limit || 100, 1), 1000);
  const multiChainQuery = `${chainQueries.join(' UNION ')}${orderClause} LIMIT ${limitValue}`;

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
