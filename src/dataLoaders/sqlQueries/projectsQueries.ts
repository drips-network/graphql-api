import { QueryTypes } from 'sequelize';
import { dbConnection } from '../../database/connectToDatabase';
import type {
  ProjectSortInput,
  ProjectWhereInput,
} from '../../generated/graphql';
import type { ProjectDataValues } from '../../project/ProjectModel';
import ProjectModel from '../../project/ProjectModel';
import type { DbSchema, RepoDriverId } from '../../common/types';
import {
  toDbProjectSortField,
  toDbVerificationStatus,
} from '../../project/projectUtils';

async function getProjectByUrl(
  chains: DbSchema[],
  url: string,
): Promise<ProjectDataValues[]> {
  const baseSQL = (schema: DbSchema) => `
    SELECT
      account_id,
      is_valid,
      is_visible,
      name,
      verification_status::text as verification_status,
      owner_address,
      owner_account_id,
      forge::text as forge,
      url,
      emoji,
      avatar_cid,
      color,
      last_processed_ipfs_hash,
      last_processed_version,
      claimed_at,
      created_at,
      updated_at,
      '${schema}' AS chain
    FROM ${schema}.projects
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
  limit?: number,
): Promise<ProjectDataValues[]> {
  const baseSQL = (schema: DbSchema) => `
    SELECT
      account_id,
      is_valid,
      is_visible,
      name,
      verification_status::text as verification_status,
      owner_address,
      owner_account_id,
      forge::text as forge,
      url,
      emoji,
      avatar_cid,
      color,
      last_processed_ipfs_hash,
      last_processed_version,
      claimed_at,
      created_at,
      updated_at,
      '${schema}' AS chain
    FROM ${schema}.projects
  `;

  const conditions: string[] = ['is_valid = true'];
  const parameters: { [key: string]: any } = {};

  if (where?.accountId) {
    conditions.push(`account_id = :accountId`);
    parameters.accountId = where.accountId;
  }
  if (where?.ownerAddress) {
    conditions.push(`LOWER(owner_address) = LOWER(:ownerAddress)`);
    parameters.ownerAddress = where.ownerAddress;
  }
  if (where?.url) {
    conditions.push(`url = :url`);
    parameters.url = where.url;
  }
  if (where?.verificationStatus) {
    conditions.push(`verification_status = :verificationStatus`);
    parameters.verificationStatus = toDbVerificationStatus(
      where.verificationStatus,
    );
  }

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const orderClause = sort
    ? ` ORDER BY "${toDbProjectSortField(sort.field)}" ${sort.direction || 'DESC'}`
    : '';

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  const limitValue = Math.min(Math.max(limit || 100, 1), 1000);
  const multiChainQuery = `${queries.join(' UNION ')}${orderClause} LIMIT ${limitValue}`;

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
  const baseSQL = (schema: DbSchema) => `
    SELECT
      account_id,
      is_valid,
      is_visible,
      name,
      verification_status::text as verification_status,
      owner_address,
      owner_account_id,
      forge::text as forge,
      url,
      emoji,
      avatar_cid,
      color,
      last_processed_ipfs_hash,
      last_processed_version,
      claimed_at,
      created_at,
      updated_at,
      '${schema}' AS chain
    FROM ${schema}.projects
  `;

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
