import { QueryTypes } from 'sequelize';
import type { DbSchema, ImmutableSplitsDriverId } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { SubListDataValues } from '../../sub-list/SubListModel';
import SubListModel from '../../sub-list/SubListModel';

async function getSubListsByIds(
  chains: DbSchema[],
  subListIds: ImmutableSplitsDriverId[],
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT *, '${schema}' AS chain FROM ${schema}.sub_lists`;

  const conditions: string[] = [
    'account_id IN (:dripListIds)',
    'is_valid = true',
  ];
  const parameters: { [key: string]: any } = { dripListIds: subListIds };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: SubListModel,
    })
  ).map((p) => p.dataValues as SubListDataValues);
}

export default {
  getByIds: getSubListsByIds,
};
