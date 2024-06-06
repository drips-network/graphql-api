import { QueryTypes } from 'sequelize';
import { dbConnection } from '../../database/connectToDatabase';
import type {
  ProjectSortInput,
  ProjectWhereInput,
  SupportedChain,
} from '../../generated/graphql';
import type { ProjectDataValues } from '../../project/ProjectModel';
import ProjectModel from '../../project/ProjectModel';
import type { ProjectId } from '../../common/types';

async function getProjectByUrl(
  chain: SupportedChain,
  url: string,
): Promise<ProjectDataValues | null> {
  const baseSQL = (schema: SupportedChain) => `
    SELECT "id", "isValid", "name", "verificationStatus"::TEXT, "claimedAt", "forge"::TEXT, "ownerAddress", "ownerAccountId", "url", "emoji", "avatarCid", "color", "description", "createdAt", "updatedAt", '${schema}' AS chain
    FROM "${schema}"."GitProjects"
  `;

  const conditions: string[] = ['"url" = :url', '"isValid" = true'];
  const parameters: { [key: string]: any } = { url };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const query = `${baseSQL(chain) + whereClause} LIMIT 1`;

  const dbProject = (
    await dbConnection.query(query, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: ProjectModel,
    })
  ).map((p) => p.dataValues as ProjectDataValues)[0];

  return dbProject || null;
}

async function getProjectsByIds(
  chains: SupportedChain[],
  projectIds: ProjectId[],
): Promise<ProjectDataValues[]> {
  // Define base SQL to query from multiple chains (schemas).
  const baseSQL = (schema: SupportedChain) => `
  SELECT "id", "isValid", "name", "verificationStatus"::TEXT, "claimedAt", "forge"::TEXT, "ownerAddress", "ownerAccountId", "url", "emoji", "avatarCid", "color", "description", "createdAt", "updatedAt", '${schema}' AS chain
  FROM "${schema}"."GitProjects"
`;

  const parameters: { [key: string]: any } = { projectIds };

  const whereClause = ` WHERE "id" IN (:projectIds) AND "isValid" = true`;

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

async function getProjectsByFilter(
  chains: SupportedChain[],
  where?: ProjectWhereInput,
  sort?: ProjectSortInput,
): Promise<ProjectDataValues[]> {
  const baseSQL = (schema: SupportedChain) =>
    `SELECT 
      "id", "isValid", "name", "verificationStatus"::TEXT, "claimedAt", "forge"::TEXT, "ownerAddress", "ownerAccountId", "url", "emoji", "avatarCid", "color", "description", "createdAt", "updatedAt", '${schema}' AS chain 
     FROM "${schema}"."GitProjects" `;

  const conditions: string[] = ['"isValid" = true'];
  const parameters: { [key: string]: any } = {};

  if (where?.id) {
    conditions.push(`"id" = :id`);
    parameters.id = where.id;
  }
  if (where?.ownerAddress) {
    conditions.push(`"ownerAddress" = :ownerAddress`);
    parameters.ownerAddress = where.ownerAddress;
  }
  if (where?.url) {
    conditions.push(`"url" = :url`);
    parameters.url = where.url;
  }
  if (where?.verificationStatus) {
    conditions.push(`"verificationStatus" = :verificationStatus`);
    parameters.verificationStatus = where.verificationStatus;
  }

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const orderClause = sort
    ? ` ORDER BY "${sort.field}" ${sort.direction || 'DESC'}`
    : '';

  const queries = chains.map(
    (chain) => baseSQL(chain) + whereClause + orderClause,
  );

  const multiChainQuery = `${queries.join(' UNION ')} LIMIT 1000`;

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
