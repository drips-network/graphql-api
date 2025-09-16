import { QueryTypes } from 'sequelize';
import { dbConnection } from '../../database/connectToDatabase';
import type { LinkedIdentityDataValues } from '../../linked-identity/LinkedIdentityModel';
import LinkedIdentityModel from '../../linked-identity/LinkedIdentityModel';
import type { Address, DbSchema, RepoDriverId } from '../../common/types';
import type {
  LinkedIdentityWhereInput,
  LinkedIdentitySortInput,
} from '../../generated/graphql';

export default {
  async getByIds(
    chains: DbSchema[],
    accountIds: RepoDriverId[],
  ): Promise<LinkedIdentityDataValues[]> {
    const baseSQL = (schema: DbSchema) =>
      `SELECT *, '${schema}' AS chain FROM ${schema}.linked_identities`;

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
    const baseSQL = (schema: DbSchema) =>
      `SELECT *, '${schema}' AS chain FROM ${schema}.linked_identities`;

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

  async getLinkedIdentitiesByFilter(
    chains: DbSchema[],
    where?: LinkedIdentityWhereInput,
    sort?: LinkedIdentitySortInput,
    limit: number = 100,
  ): Promise<LinkedIdentityDataValues[]> {
    const baseSQL = (schema: DbSchema) =>
      `SELECT *, '${schema}' AS chain FROM ${schema}.linked_identities`;

    const conditions: string[] = [];
    const parameters: { [key: string]: any } = { limit };

    if (where?.type) {
      conditions.push(`"identity_type" = :identityType`);
      parameters.identityType = where.type;
    }

    if (where?.accountId) {
      conditions.push(`"account_id" = :accountId`);
      parameters.accountId = where.accountId;
    }

    if (where?.ownerAddress) {
      whereClause += ` AND LOWER("owner_address") = LOWER(:ownerAddress)`;
      parameters.ownerAddress = where.ownerAddress;
    }

    if (where?.areSplitsValid !== undefined) {
      conditions.push(`"areSplitsValid" = :areSplitsValid`);
      parameters.areSplitsValid = where.areSplitsValid;
    }

    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

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

  // getOrcidAccountById removed; rely on getByIds and filter by type if needed upstream
};
