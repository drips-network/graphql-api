import { QueryTypes } from 'sequelize';
import type { DbSchema, NftDriverId } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { EcosystemDataValues } from '../../ecosystem/EcosystemModel';
import EcosystemModel from '../../ecosystem/EcosystemModel';

async function getEcosystemsByIds(
  chains: DbSchema[],
  ecosystemsIds: NftDriverId[],
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT "id", "isValid", "isVisible", "ownerAddress", "ownerAccountId", "name", "description", "creator", "previousOwnerAddress", "createdAt", "updatedAt", "lastProcessedIpfsHash", '${schema}' AS chain
    FROM "${schema}"."Ecosystems"
  `;

  const conditions: string[] = ['"id" IN (:ecosystemsIds)', '"isValid" = true'];
  const parameters: { [key: string]: any } = { ecosystemsIds };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: EcosystemModel,
    })
  ).map((p) => p.dataValues as EcosystemDataValues);
}

export default {
  getByIds: getEcosystemsByIds,
};
