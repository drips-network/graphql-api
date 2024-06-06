import { QueryTypes } from 'sequelize';
import type { AccountId } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import type { SupportedChain } from '../../generated/graphql';
import type { SplitEventModelDataValues } from '../../models/SplitEventModel';
import SplitEventModel from '../../models/SplitEventModel';

async function getSplitEventsByAccountIdAndReceiver(
  chains: SupportedChain[],
  accountId: AccountId,
  receiver: AccountId,
): Promise<SplitEventModelDataValues[]> {
  const baseSQL = (schema: SupportedChain) =>
    `SELECT *, '${schema}' AS chain FROM "${schema}"."SplitEvents"`;

  const conditions: string[] = [
    '"accountId" = :accountId',
    '"receiver" = :receiver',
  ];
  const parameters: { [receiver: string]: any } = {
    accountId,
    receiver,
  };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: SplitEventModel,
    })
  ).map((p) => p.dataValues as SplitEventModelDataValues);
}

export default {
  getByAccountIdAndReceiver: getSplitEventsByAccountIdAndReceiver,
};
