import { QueryTypes } from 'sequelize';
import type { AccountId, DbSchema } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { AccountMetadataEmittedEventModelDataValues } from '../../models/AccountMetadataEmittedEventModel';
import AccountMetadataEmittedEventModel from '../../models/AccountMetadataEmittedEventModel';

async function getAccountMetadataEmittedEventsByAccountId(
  chains: DbSchema[],
  accountId: AccountId,
) {
  const baseSQL = (schema: DbSchema) =>
    `SELECT *,'${schema}' AS chain FROM ${schema}.account_metadata_emitted_events`;

  const parameters: { [key: string]: any } = { accountId };

  const whereClause = ` WHERE "account_id" = :accountId`;

  const orderClause = ' ORDER BY block_number DESC, "log_index" DESC';

  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  const fullQuery = `${queries.join(' UNION ')}${orderClause} LIMIT 1`;

  return (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: AccountMetadataEmittedEventModel,
    })
  ).map((p) => p.dataValues as AccountMetadataEmittedEventModelDataValues);
}

export default {
  getByAccountId: getAccountMetadataEmittedEventsByAccountId,
};
