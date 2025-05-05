import { QueryTypes } from 'sequelize';
import type { DbSchema, NftDriverId } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { EcosystemDataValues } from '../../ecosystem/EcosystemMainAccountModel';
import EcosystemMainAccountModel from '../../ecosystem/EcosystemMainAccountModel';

async function getEcosystemsByIds(
  chains: DbSchema[],
  ecosystemsIds: NftDriverId[],
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT *, '${schema}' AS chain FROM ${schema}.ecosystem_main_accounts
  `;

  const conditions: string[] = [
    'account_id IN (:ecosystemsIds)',
    'is_valid = true',
  ];
  const parameters: { [key: string]: any } = { ecosystemsIds };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: EcosystemMainAccountModel,
    })
  ).map((p) => p.dataValues as EcosystemDataValues);
}

export default {
  getByIds: getEcosystemsByIds,
};
