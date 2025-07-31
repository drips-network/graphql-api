import { QueryTypes } from 'sequelize';
import type { AccountId, DbSchema } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { StreamReceiverSeenEventModelDataValues } from '../../models/StreamReceiverSeenEventModel';
import StreamReceiverSeenEventModel from '../../models/StreamReceiverSeenEventModel';

async function getStreamReceiverSeenEventsByAccountId(
  chains: DbSchema[],
  accountId: AccountId,
) {
  const baseSQL = (schema: DbSchema) =>
    `SELECT *, '${schema}' AS chain FROM "${schema}"."stream_receiver_seen_events" WHERE "account_id" = :accountId`;

  const fullQuery = `${chains
    .map((chain) => `${baseSQL(chain)}`)
    .join(' UNION ')}`;

  return (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: { accountId },
      mapToModel: true,
      model: StreamReceiverSeenEventModel,
    })
  ).map((p) => p.dataValues as StreamReceiverSeenEventModelDataValues);
}

export default {
  getByAccountId: getStreamReceiverSeenEventsByAccountId,
};
