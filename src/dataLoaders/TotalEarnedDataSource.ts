/* eslint-disable no-param-reassign */
import DataLoader from 'dataloader';
import { QueryTypes } from 'sequelize';
import type {
  AccountId,
  DripListId,
  DripListMultiChainKey,
  ProjectId,
  ProjectMultiChainKey,
} from '../common/types';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import type { SupportedChain } from '../generated/graphql';
import { dbConnection } from '../database/connectToDatabase';
import type { SplitEventModelDataValues } from '../models/SplitEventModel';
import SplitEventModel from '../models/SplitEventModel';
import type { GivenEventModelDataValues } from '../given-event/GivenEventModel';
import GivenEventModel from '../given-event/GivenEventModel';
import { isDripListId, isProjectId } from '../utils/assert';
import shouldNeverHappen from '../utils/shouldNeverHappen';

export default class TotalEarnedDataSource {
  private readonly _batchTotalEarnedByProjectIds = new DataLoader(
    async (keys: readonly (DripListMultiChainKey | ProjectMultiChainKey)[]) => {
      const { chains, ids: projectIds } = parseMultiChainKeys(keys);

      // Define base SQL to query from multiple chains (schemas).
      const baseSplitEventsSQL = (schema: SupportedChain) =>
        `SELECT "accountId", "receiver", "erc20", "amt", "transactionHash", "logIndex", "blockTimestamp", "blockNumber", "createdAt", "updatedAt", '${schema}' AS chain FROM "${schema}"."SplitEvents"`;

      const baseGivenEventsSplitsSQL = (schema: SupportedChain) =>
        `SELECT "accountId", "receiver", "erc20", "amt", "transactionHash", "logIndex", "blockTimestamp", "blockNumber", "createdAt", "updatedAt", '${schema}' AS chain FROM "${schema}"."GivenEvents"`;

      // Build the WHERE clause.
      const conditions: string[] = [`"receiver" IN (:receivers)`];
      const parameters: { [key: string]: any } = {
        receivers: projectIds,
      };

      // Join conditions into a single WHERE clause.
      const whereClause =
        conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

      // Build the SQL for each specified schema.
      const splitsQueries = chains.map(
        (chain) => baseSplitEventsSQL(chain) + whereClause,
      );
      const givenQueries = chains.map(
        (chain) => baseGivenEventsSplitsSQL(chain) + whereClause,
      );

      // Combine all schema queries with UNION.
      const fullSplitsQuery = `${splitsQueries.join(' UNION ')} LIMIT 1000`;
      const fullGivenQuery = `${givenQueries.join(' UNION ')} LIMIT 1000`;

      const splitEventModelDataValues = (
        await dbConnection.query(fullSplitsQuery, {
          type: QueryTypes.SELECT,
          replacements: parameters,
          mapToModel: true,
          model: SplitEventModel,
        })
      ).map((p) => p.dataValues as SplitEventModelDataValues);

      const givenEventModelDataValues = (
        await dbConnection.query(fullGivenQuery, {
          type: QueryTypes.SELECT,
          replacements: parameters,
          mapToModel: true,
          model: GivenEventModel,
        })
      ).map((p) => p.dataValues as GivenEventModelDataValues);

      const splitEventsByDripListId = splitEventModelDataValues.reduce<
        Record<AccountId, SplitEventModelDataValues[]>
      >((mapping, event) => {
        if (!mapping[event.receiver]) {
          mapping[event.receiver] = [];
        }

        mapping[event.receiver].push(event);

        return mapping;
      }, {});

      const givenEventsByDripListId = givenEventModelDataValues.reduce<
        Record<AccountId, GivenEventModelDataValues[]>
      >((mapping, event) => {
        if (!mapping[event.receiver]) {
          mapping[event.receiver] = [];
        }

        mapping[event.receiver].push(event);

        return mapping;
      }, {});

      return projectIds.map((id) => ({
        splitEventsForDripListDataValues: splitEventsByDripListId[id] || [],
        givenEventsForDripListDataValues: givenEventsByDripListId[id] || [],
      }));
    },
  );

  public async getTotalEarnedByProjectIds(
    id: DripListId | ProjectId,
    chains: SupportedChain[],
  ): Promise<{
    splitEventsForDripListDataValues: SplitEventModelDataValues[];
    givenEventsForDripListDataValues: GivenEventModelDataValues[];
  }> {
    // eslint-disable-next-line no-nested-ternary
    const key = isDripListId(id)
      ? { dripListId: id, chains }
      : isProjectId(id)
      ? { projectId: id, chains }
      : shouldNeverHappen();

    return this._batchTotalEarnedByProjectIds.load(key);
  }
}
