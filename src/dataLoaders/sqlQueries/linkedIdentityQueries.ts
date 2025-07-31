import { QueryTypes } from 'sequelize';
import { dbConnection } from '../../database/connectToDatabase';
import type { LinkedIdentityDataValues } from '../../linked-identity/LinkedIdentityModel';
import LinkedIdentityModel from '../../linked-identity/LinkedIdentityModel';
import type { Address, DbSchema, RepoDriverId } from '../../common/types';

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

    const whereClause = ` WHERE "owner_address" = :ownerAddress`;

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
};
