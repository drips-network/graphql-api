import { QueryTypes } from 'sequelize';
import { dbConnection } from '../../database/connectToDatabase';
import type { LinkedIdentityDataValues } from '../../linked-identity/LinkedIdentityModel';
import LinkedIdentityModel from '../../linked-identity/LinkedIdentityModel';
import type { Address, DbSchema, RepoDriverId } from '../../common/types';
import type {
  OrcidAccountWhereInput,
  OrcidAccountSortInput,
} from '../../generated/graphql';

export default {
  async getByIds(
    chains: DbSchema[],
    accountIds: RepoDriverId[],
  ): Promise<LinkedIdentityDataValues[]> {
    const baseSQL = (schema: DbSchema) => `
      SELECT
        account_id,
        identity_type::text as identity_type,
        owner_address,
        owner_account_id,
        is_linked,
        last_processed_version,
        created_at,
        updated_at,
        '${schema}' AS chain
      FROM ${schema}.linked_identities
    `;

    const parameters: { [key: string]: any } = { accountIds };

    const whereClause = ` WHERE "account_id" IN (:accountIds)`;

    const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

    const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

    return (
      await dbConnection.query(multiChainQuery, {
        type: QueryTypes.SELECT,
        replacements: parameters,
        mapToModel: true,
        model: LinkedIdentityModel,
      })
    ).map((identity) => identity.dataValues as LinkedIdentityDataValues);
  },

  async getByOwnerAddress(
    chains: DbSchema[],
    ownerAddress: Address,
  ): Promise<LinkedIdentityDataValues[]> {
    const baseSQL = (schema: DbSchema) => `
      SELECT
        account_id,
        identity_type::text as identity_type,
        owner_address,
        owner_account_id,
        is_linked,
        last_processed_version,
        created_at,
        updated_at,
        '${schema}' AS chain
      FROM ${schema}.linked_identities
    `;

    const parameters: { [key: string]: any } = { ownerAddress };

    const whereClause = ` WHERE LOWER("owner_address") = LOWER(:ownerAddress)`;

    const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

    const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

    return (
      await dbConnection.query(multiChainQuery, {
        type: QueryTypes.SELECT,
        replacements: parameters,
        mapToModel: true,
        model: LinkedIdentityModel,
      })
    ).map((identity) => identity.dataValues as LinkedIdentityDataValues);
  },

  async getOrcidAccountsByFilter(
    chains: DbSchema[],
    where?: OrcidAccountWhereInput,
    sort?: OrcidAccountSortInput,
    limit: number = 100,
  ): Promise<LinkedIdentityDataValues[]> {
    const baseSQL = (schema: DbSchema) => `
      SELECT
        account_id,
        identity_type::text as identity_type,
        owner_address,
        owner_account_id,
        is_linked,
        last_processed_version,
        created_at,
        updated_at,
        '${schema}' AS chain
      FROM ${schema}.linked_identities
    `;

    const parameters: { [key: string]: any } = { limit };
    let whereClause = ` WHERE "identity_type" = 'orcid'`;

    if (where?.accountId) {
      whereClause += ` AND "account_id" = :accountId`;
      parameters.accountId = where.accountId;
    }

    if (where?.ownerAddress) {
      whereClause += ` AND LOWER("owner_address") = LOWER(:ownerAddress)`;
      parameters.ownerAddress = where.ownerAddress;
    }

    if (where?.isLinked !== undefined) {
      whereClause += ` AND "is_linked" = :isLinked`;
      parameters.isLinked = where.isLinked;
    }

    let orderClause = '';
    if (sort?.field === 'createdAt') {
      orderClause = ` ORDER BY "created_at" ${sort.direction || 'ASC'}`;
    }

    const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);
    const multiChainQuery = `${chainQueries.join(' UNION ')}${orderClause} LIMIT :limit`;

    return (
      await dbConnection.query(multiChainQuery, {
        type: QueryTypes.SELECT,
        replacements: parameters,
        mapToModel: true,
        model: LinkedIdentityModel,
      })
    ).map((identity) => identity.dataValues as LinkedIdentityDataValues);
  },

  async getOrcidAccountById(
    accountId: RepoDriverId,
    chains: DbSchema[],
  ): Promise<LinkedIdentityDataValues[] | null> {
    const baseSQL = (schema: DbSchema) => `
      SELECT
        account_id,
        identity_type::text as identity_type,
        owner_address,
        owner_account_id,
        is_linked,
        last_processed_version,
        created_at,
        updated_at,
        '${schema}' AS chain
      FROM ${schema}.linked_identities
    `;

    const parameters: { [key: string]: any } = { accountId };
    const whereClause = ` WHERE "account_id" = :accountId AND "identity_type" = 'orcid'`;

    const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);
    const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

    const results = (
      await dbConnection.query(multiChainQuery, {
        type: QueryTypes.SELECT,
        replacements: parameters,
        mapToModel: true,
        model: LinkedIdentityModel,
      })
    ).map((identity) => identity.dataValues as LinkedIdentityDataValues);

    return results.length > 0 ? results : null;
  },
};
