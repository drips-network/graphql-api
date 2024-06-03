/* eslint-disable no-param-reassign */

import { QueryTypes } from 'sequelize';
import DataLoader from 'dataloader';
import type { GiveWhereInput, SupportedChain } from '../generated/graphql';
import type { GivenEventModelDataValues } from '../given-event/GivenEventModel';
import GivenEventModel from '../given-event/GivenEventModel';
import { dbConnection } from '../database/connectToDatabase';

type TransactionHash = string;
type LogIndex = number;
type CompositePrimaryKey = readonly [TransactionHash, LogIndex];

export default class GivenEventsDataSource {
  private readonly _batchGivenEventsByIds = new DataLoader(
    async (
      keys: readonly {
        chains: SupportedChain[];
        key: CompositePrimaryKey;
      }[],
    ): Promise<GivenEventModelDataValues[]> => {
      const chains = [...new Set(keys.flatMap((key) => key.chains))];
      const givenEventIds = keys.map(({ key }) => key);
      const transactionHashes = givenEventIds.map(
        ([transactionHash]) => transactionHash,
      );
      const logIndexes = givenEventIds.map(([, logIndex]) => logIndex);

      // Define base SQL to query from multiple chains (schemas).
      const baseSQL = (schema: SupportedChain) => `
        SELECT "accountId", "receiver", "erc20", "amt", "transactionHash", "logIndex", "blockTimestamp", "blockNumber", "createdAt", "updatedAt", '${schema}' AS chain
        FROM "${schema}"."GivenEvents"
      `;

      // Initialize the WHERE clause parts.
      const conditions: string[] = [
        '"transactionHash" IN (:transactionHashes)',
        '"logIndex" IN (:logIndexes)',
      ];
      const parameters: { [key: string]: any } = {
        transactionHashes,
        logIndexes,
      };

      // Build the where clause.
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;

      // Build the SQL for each specified schema.
      const queries = chains.map((chain) => baseSQL(chain) + whereClause);

      // Combine all schema queries with UNION.
      const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

      const givenEventsDataValues = (
        await dbConnection.query(fullQuery, {
          type: QueryTypes.SELECT,
          replacements: parameters,
          mapToModel: true,
          model: GivenEventModel,
        })
      ).map((p) => p.dataValues as GivenEventModelDataValues);

      const idToEventMap = givenEventsDataValues.reduce<
        Record<`${string}-${string}`, GivenEventModelDataValues>
      >((mapping, givenEvent) => {
        const key: `${string}-${string}` = `${givenEvent.transactionHash}-${givenEvent.logIndex}`;

        mapping[key] = givenEvent;

        return mapping;
      }, {});

      return givenEventIds.map((id) => idToEventMap[`${id[0]}-${id[1]}`]);
    },
  );

  public async getGivenEventById(
    chains: SupportedChain[],
    transactionHash: TransactionHash,
    logIndex: LogIndex,
  ): Promise<GivenEventModelDataValues> {
    return this._batchGivenEventsByIds.load({
      chains,
      key: [transactionHash, logIndex],
    });
  }

  public async getGivenEventsByFilter(
    chains: SupportedChain[],
    where: GiveWhereInput,
  ): Promise<GivenEventModelDataValues[]> {
    // Define base SQL to query from multiple chains (schemas).
    const baseSQL = (schema: SupportedChain) => `
        SELECT "accountId", "receiver", "erc20", "amt", "transactionHash", "logIndex", "blockTimestamp", "blockNumber", "createdAt", "updatedAt", '${schema}' AS chain
        FROM "${schema}"."GivenEvents"
    `;

    // Initialize the WHERE clause parts.
    const conditions: string[] = [];
    const parameters: { [key: string]: any } = {};

    // Build the WHERE clause based on input filters.
    if (where?.receiverAccountId) {
      conditions.push(`"receiver" = :receiver`);
      parameters.receiver = where.receiverAccountId;
    }
    if (where?.senderAccountId) {
      conditions.push(`"accountId" = :accountId`);
      parameters.accountId = where.senderAccountId;
    }
    if (where?.tokenAddress) {
      conditions.push(`"erc20" = :erc20`);
      parameters.erc20 = where.tokenAddress;
    }

    // Join conditions into a single WHERE clause.
    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    // Build the SQL for each specified schema.
    const queries = chains.map((chain) => baseSQL(chain) + whereClause);

    // Combine all schema queries with UNION.
    const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

    const givenEventsDataValues = (
      await dbConnection.query(fullQuery, {
        type: QueryTypes.SELECT,
        replacements: parameters,
        mapToModel: true,
        model: GivenEventModel,
      })
    ).map((p) => p.dataValues as GivenEventModelDataValues);

    return givenEventsDataValues;
  }
}
