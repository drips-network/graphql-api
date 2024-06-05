import { QueryTypes } from 'sequelize';
import { dbConnection } from '../database/connectToDatabase';
import type {
  ProjectSortInput,
  ProjectWhereInput,
  SupportedChain,
} from '../generated/graphql';
import type { ProjectDataValues } from '../project/ProjectModel';
import ProjectModel from '../project/ProjectModel';

async function getProjectsByFilter(
  chains: SupportedChain[],
  where?: ProjectWhereInput,
  sort?: ProjectSortInput,
) {
  const baseSQL = (schema: SupportedChain) =>
    `SELECT 
      "id", "isValid", "name", "verificationStatus"::TEXT, "claimedAt", "forge"::TEXT, "ownerAddress", "ownerAccountId", "url", "emoji", "avatarCid", "color", "description", "createdAt", "updatedAt", '${schema}' AS chain 
     FROM "${schema}"."GitProjects" `;

  const conditions: string[] = [];
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

  const whereClause =
    conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

  const orderClause = sort
    ? ` ORDER BY "${sort.field}" ${sort.direction || 'DESC'}`
    : '';

  const chainQueries = chains.map(
    (chain) => baseSQL(chain) + whereClause + orderClause,
  );

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
  projects: {
    getProjectsByFilter,
  },
};
