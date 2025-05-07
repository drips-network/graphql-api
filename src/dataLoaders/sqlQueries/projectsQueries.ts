import { QueryTypes } from 'sequelize';
import { dbConnection } from '../../database/connectToDatabase';
import type {
  ProjectSortInput,
  ProjectWhereInput,
} from '../../generated/graphql';
import type { ProjectDataValues } from '../../project/ProjectModel';
import ProjectModel from '../../project/ProjectModel';
import type { DbSchema, RepoDriverId } from '../../common/types';

async function getProjectByUrl(
  chains: DbSchema[],
  url: string,
): Promise<ProjectDataValues[]> {
  const baseSQL = (schema: DbSchema) => `
    SELECT *, '${schema}' AS chain FROM ${schema}.projects
  `;

  const conditions: string[] = ['url = :url', 'is_valid = true'];
  const parameters: { [key: string]: any } = { url };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  const fullQuery = `${queries.join(' UNION ')}`;

  return (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: ProjectModel,
    })
  ).map((p) => p.dataValues as ProjectDataValues);
}

async function getProjectsByFilter(
  chains: DbSchema[],
  where?: ProjectWhereInput,
  sort?: ProjectSortInput,
): Promise<ProjectDataValues[]> {
  const baseSQL = (schema: DbSchema) =>
    `SELECT *, '${schema}' AS chain FROM ${schema}.projects `;

  const conditions: string[] = ['is_valid = true'];
  const parameters: { [key: string]: any } = {};

  if (where?.accountId) {
    conditions.push(`account_id = :accountId`);
    parameters.accountId = where.accountId;
  }
  if (where?.ownerAddress) {
    conditions.push(`owner_address = :ownerAddress`);
    parameters.ownerAddress = where.ownerAddress;
  }
  if (where?.url) {
    conditions.push(`url = :url`);
    parameters.url = where.url;
  }
  if (where?.verificationStatus) {
    conditions.push(`verification_status = :verificationStatus`);
    parameters.verificationStatus = where.verificationStatus;
  }

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const orderClause = sort
    ? ` ORDER BY "${sort.field}" ${sort.direction || 'DESC'}`
    : '';

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${queries.join(' UNION ')}${orderClause} LIMIT 1000`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: ProjectModel,
    })
  ).map((p) => p.dataValues as ProjectDataValues);
}

async function getProjectsByIds(
  chains: DbSchema[],
  projectIds: RepoDriverId[],
): Promise<ProjectDataValues[]> {
  const baseSQL = (schema: DbSchema) =>
    `SELECT *, '${schema}' AS chain FROM ${schema}.projects`;

  const parameters: { [key: string]: any } = { projectIds };

  const whereClause = ` WHERE "account_id" IN (:projectIds) AND is_valid = true`;

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: ProjectModel,
    })
  ).map((p) => p.dataValues as ProjectDataValues);
}

export default {
  getByUrl: getProjectByUrl,
  getByIds: getProjectsByIds,
  getByFilter: getProjectsByFilter,
};
