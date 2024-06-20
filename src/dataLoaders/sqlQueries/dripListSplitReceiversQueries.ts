import { QueryTypes } from 'sequelize';
import { DependencyType } from '../../common/types';
import type { DbSchema, DripListId, ProjectId } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { DripListSplitReceiverModelDataValues } from '../../models/DripListSplitReceiverModel';
import DripListSplitReceiverModel from '../../models/DripListSplitReceiverModel';

async function getDripListSplitReceiversByFundeeDripListIds(
  chains: DbSchema[],
  fundeeDripListIds: DripListId[],
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT "id", "fundeeDripListId", "funderProjectId", "funderDripListId", "weight", "type"::TEXT, "blockTimestamp", "createdAt", "updatedAt", '${schema}' AS chain
    FROM "${schema}"."DripListSplitReceivers"
  `;

  const conditions: string[] = [`"fundeeDripListId" IN (:fundeeDripListIds)`];
  const parameters: { [key: string]: any } = {
    fundeeDripListIds,
  };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  // Combine all schema queries with UNION.
  const fullQuery = `${queries.join(' UNION ')}`;

  return (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: DripListSplitReceiverModel,
    })
  ).map((p) => p.dataValues as DripListSplitReceiverModelDataValues);
}

async function getDripListSplitReceiversByFunderProjectIds(
  chains: DbSchema[],
  funderProjectIds: ProjectId[],
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT "id", "fundeeDripListId", "funderProjectId", "funderDripListId", "weight", "type"::TEXT, "blockTimestamp", "createdAt", "updatedAt",'${schema}' AS chain
    FROM "${schema}"."DripListSplitReceivers"
  `;

  const conditions: string[] = [
    `"funderProjectId" IN (:funderProjectIds)`,
    `type = '${DependencyType.ProjectDependency}'`,
  ];
  const parameters: { [key: string]: any } = {
    funderProjectIds,
  };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  const fullQuery = `${queries.join(' UNION ')}`;

  return (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: DripListSplitReceiverModel,
    })
  ).map((p) => p.dataValues as DripListSplitReceiverModelDataValues);
}

async function getDripListSplitReceiversByFunderDripListIds(
  chains: DbSchema[],
  funderDripListIds: DripListId[],
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT "id", "fundeeDripListId", "funderProjectId", "funderDripListId", "weight", "type"::TEXT, "blockTimestamp", "createdAt", "updatedAt",'${schema}' AS chain
    FROM "${schema}"."DripListSplitReceivers"
  `;

  const conditions: string[] = [
    `"funderDripListId" IN (:funderDripListIds)`,
    `type = '${DependencyType.DripListDependency}'`,
  ];
  const parameters: { [key: string]: any } = {
    funderDripListIds,
  };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  const fullQuery = `${queries.join(' UNION ')}`;

  return (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: DripListSplitReceiverModel,
    })
  ).map((p) => p.dataValues as DripListSplitReceiverModelDataValues);
}

export default {
  getByFundeeDripListIds: getDripListSplitReceiversByFundeeDripListIds,
  getByFunderProjectIds: getDripListSplitReceiversByFunderProjectIds,
  getByFunderDripListIds: getDripListSplitReceiversByFunderDripListIds,
};
