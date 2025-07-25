import { QueryTypes } from 'sequelize';
import type { DbSchema, DripListId } from '../../common/types';
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
          SELECT DISTINCT ON ("tokenId") 
            "tokenId", 
            "blockTimestamp" as "mintedAt"
          FROM "${schema}"."TransferEvents" 
          WHERE "from" = '0x0000000000000000000000000000000000000000'
          ORDER BY "tokenId", "blockTimestamp" ASC
        )
        SELECT dl."id", dl."isValid", dl."isVisible", dl."name", dl."creator", dl."description", dl."ownerAddress", dl."ownerAccountId", dl."latestVotingRoundId", dl."previousOwnerAddress", dl."createdAt", dl."updatedAt", '${schema}' AS chain
        FROM "${schema}"."DripLists" dl
        INNER JOIN mint_events me ON dl."id" = me."tokenId"
      `;
    }
    return `
      SELECT "id", "isValid", "isVisible", "name", "creator", "description", "ownerAddress", "ownerAccountId", "latestVotingRoundId", "previousOwnerAddress", "createdAt", "updatedAt", '${schema}' AS chain
      FROM "${schema}"."DripLists"
    `;
  };

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
  dripListIds: DripListId[],
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT "id", "isValid", "isVisible", "ownerAddress", "ownerAccountId", "name", "latestVotingRoundId", "description", "creator", "previousOwnerAddress", "createdAt", "updatedAt", "lastProcessedIpfsHash", '${schema}' AS chain
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
