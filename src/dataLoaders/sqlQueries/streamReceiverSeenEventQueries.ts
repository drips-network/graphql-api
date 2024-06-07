import { QueryTypes } from 'sequelize';
import type { AccountId } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { SupportedChain } from '../../generated/graphql';
import type { StreamReceiverSeenEventModelDataValues } from '../../models/StreamReceiverSeenEventModel';
import StreamReceiverSeenEventModel from '../../models/StreamReceiverSeenEventModel';

async function getStreamReceiverSeenEventsByAccountId(
  chains: SupportedChain[],
  accountId: AccountId,
) {
  const baseSQL = (schema: SupportedChain) =>
    `SELECT *, '${schema}' AS chain FROM "${schema}"."StreamReceiverSeenEvents" WHERE "accountId" = :accountId`;

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
