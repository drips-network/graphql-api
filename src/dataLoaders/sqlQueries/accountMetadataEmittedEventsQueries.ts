import { QueryTypes } from 'sequelize';
import type { AccountId, DbSchema } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { AccountMetadataEmittedEventModelDataValues } from '../../models/AccountMetadataEmittedEventModel';
import AccountMetadataEmittedEventModel from '../../models/AccountMetadataEmittedEventModel';

async function getAccountMetadataEmittedEventsByAccountId(
  chains: DbSchema[],
  accountId: AccountId,
) {
  // TODO: Prevent SQL injection in all queries from schema input.
  const baseSQL = (schema: DbSchema) =>
    `SELECT *,'${schema}' AS chain FROM "${schema}"."AccountMetadataEmittedEvents"`;

  const parameters: { [key: string]: any } = { accountId };

  const whereClause = ` WHERE "accountId" = :accountId`;

  const orderClause = ' ORDER BY "blockNumber" DESC, "logIndex" DESC';

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
