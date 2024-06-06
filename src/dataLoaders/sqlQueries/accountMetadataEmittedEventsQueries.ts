import { QueryTypes } from 'sequelize';
import type { AddressDriverId } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { SupportedChain } from '../../generated/graphql';
import type { AccountMetadataEmittedEventModelDataValues } from '../../models/AccountMetadataEmittedEventModel';
import AccountMetadataEmittedEventModel from '../../models/AccountMetadataEmittedEventModel';

async function getAccountMetadataEmittedEventsByAccountId(
  chains: SupportedChain[],
  accountId: AddressDriverId,
) {
  const baseSQL = (schema: SupportedChain) =>
    `SELECT *,'${schema}' AS chain FROM "${schema}"."AccountMetadataEmittedEvents"`;

  const conditions: string[] = ['"accountId" = :accountId'];
  const parameters: { [key: string]: any } = { accountId };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const orderClause = ' ORDER BY "blockNumber" DESC, "logIndex" DESC';

  const queries = chains.map(
    (chain) => baseSQL(chain) + whereClause + orderClause,
  );

  const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

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
