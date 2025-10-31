import { QueryTypes } from 'sequelize';
import type { AccountId, DbSchema } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { SplitsReceiverModelDataValues } from '../../models/SplitsReceiverModel';
import SplitsReceiverModel from '../../models/SplitsReceiverModel';

export async function getSplitsReceivers(
  chains: DbSchema[],
  receiverAccountIds: AccountId[],
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT
      id,
      receiver_account_id,
      receiver_account_type::text as receiver_account_type,
      sender_account_id,
      sender_account_type::text as sender_account_type,
      relationship_type::text as relationship_type,
      weight,
      block_timestamp,
      splits_to_repo_driver_sub_account,
      created_at,
      updated_at,
      '${schema}' AS chain
    FROM ${schema}.splits_receivers
  `;

  const conditions: string[] = ['receiver_account_id IN (:receiverAccountIds)'];

  const parameters: { [key: string]: any } = {
    receiverAccountIds,
  };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  const fullQuery = `${queries.join(' UNION ')}`;

  return (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: SplitsReceiverModel,
    })
  ).map((p) => p.dataValues as SplitsReceiverModelDataValues);
}

export async function getSplitsReceiversForSenderIds(
  chains: DbSchema[],
  senderAccountIds: AccountId[],
) {
  const baseSQL = (schema: DbSchema) => `
    SELECT
      id,
      receiver_account_id,
      receiver_account_type::text as receiver_account_type,
      sender_account_id,
      sender_account_type::text as sender_account_type,
      relationship_type::text as relationship_type,
      weight,
      block_timestamp,
      splits_to_repo_driver_sub_account,
      created_at,
      updated_at,
      '${schema}' AS chain
    FROM ${schema}.splits_receivers
  `;

  const conditions: string[] = ['sender_account_id IN (:senderAccountIds)'];

  const parameters: { [key: string]: any } = {
    senderAccountIds,
  };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  const fullQuery = `${queries.join(' UNION ')}`;

  return (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: SplitsReceiverModel,
    })
  ).map((p) => p.dataValues as SplitsReceiverModelDataValues);
}
