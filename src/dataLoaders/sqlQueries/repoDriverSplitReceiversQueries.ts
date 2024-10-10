import { QueryTypes } from 'sequelize';
import { DependencyType } from '../../common/types';
import type { DbSchema, DripListId, ProjectId } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { RepoDriverSplitReceiverModelDataValues } from '../../models/RepoDriverSplitReceiverModel';
import RepoDriverSplitReceiverModel from '../../models/RepoDriverSplitReceiverModel';

async function getRepoDriverSplitReceiversByFundeeProjectIds(
  chains: DbSchema[],
  fundeeProjectIds: ProjectId[],
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT "id", "fundeeProjectId", "funderProjectId", "funderDripListId", "weight", "type"::TEXT, "blockTimestamp", "createdAt", "updatedAt", '${schema}' AS chain
    FROM "${schema}"."RepoDriverSplitReceivers"
`;

  const conditions: string[] = [`"fundeeProjectId" IN (:fundeeProjectIds)`];
  const parameters: { [key: string]: any } = {
    fundeeProjectIds,
  };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  const fullQuery = `${queries.join(' UNION ')}`;

  return (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: RepoDriverSplitReceiverModel,
    })
  ).map((p) => p.dataValues as RepoDriverSplitReceiverModelDataValues);
}

async function getRepoDriverSplitReceiversByFunderProjectIds(
  chains: DbSchema[],
  funderProjectIds: ProjectId[],
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT "id", "fundeeProjectId", "funderProjectId", "funderDripListId", "weight", "type"::TEXT, "blockTimestamp", "createdAt", "updatedAt",'${schema}' AS chain
    FROM "${schema}"."RepoDriverSplitReceivers"
  `;

  // Build the WHERE clause.
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
      model: RepoDriverSplitReceiverModel,
    })
  ).map((p) => p.dataValues as RepoDriverSplitReceiverModelDataValues);
}

async function getRepoDriverSplitReceiversByFunderDripListIds(
  chains: DbSchema[],
  funderDripListIds: DripListId[],
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT "id", "fundeeProjectId", "funderProjectId", "funderDripListId", "weight", "type"::TEXT, "blockTimestamp", "createdAt", "updatedAt",'${schema}' AS chain
    FROM "${schema}"."RepoDriverSplitReceivers"
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
      model: RepoDriverSplitReceiverModel,
    })
  ).map((p) => p.dataValues as RepoDriverSplitReceiverModelDataValues);
}

export default {
  getByFundeeProjectIds: getRepoDriverSplitReceiversByFundeeProjectIds,
  getByFunderProjectIds: getRepoDriverSplitReceiversByFunderProjectIds,
  getByFunderDripListIds: getRepoDriverSplitReceiversByFunderDripListIds,
};
