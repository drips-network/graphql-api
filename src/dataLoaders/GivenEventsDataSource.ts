/* eslint-disable no-param-reassign */

import DataLoader from 'dataloader';
import type { GiveWhereInput } from '../generated/graphql';
import type { GivenEventModelDataValues } from '../given-event/GivenEventModel';
import givenEventsQueries from './sqlQueries/givenEventsQueries';
import type { DbSchema } from '../common/types';

type TransactionHash = string;
type LogIndex = number;
type CompositePrimaryKey = readonly [TransactionHash, LogIndex];

export default class GivenEventsDataSource {
  private readonly _batchGivenEventsByIds = new DataLoader(
    async (
      keys: readonly {
        chains: DbSchema[];
        key: CompositePrimaryKey;
      }[],
    ): Promise<(GivenEventModelDataValues | null)[]> => {
      const chains = [...new Set(keys.flatMap((key) => key.chains))];
      const givenEventIds = keys.map(({ key }) => key);
      const transactionHashes = givenEventIds.map(
        ([transactionHash]) => transactionHash,
      );
      const logIndexes = givenEventIds.map(([, logIndex]) => logIndex);

      const givenEventsDataValues =
        await givenEventsQueries.getByTxHashesAndLogIndex(
          chains,
          transactionHashes,
          logIndexes,
        );

      const idToEventMap = givenEventsDataValues.reduce<
        Record<`${string}-${string}`, GivenEventModelDataValues>
      >((mapping, givenEvent) => {
        const key: `${string}-${string}` = `${givenEvent.transactionHash}-${givenEvent.logIndex}`;

        mapping[key] = givenEvent;

        return mapping;
      }, {});

      return givenEventIds.map(
        (id) => idToEventMap[`${id[0]}-${id[1]}`] || null,
      );
    },
  );

  public async getGivenEventByIdOnChain(
    chain: DbSchema,
    transactionHash: TransactionHash,
    logIndex: LogIndex,
  ): Promise<GivenEventModelDataValues | null> {
    return this._batchGivenEventsByIds.load({
      chains: [chain],
      key: [transactionHash, logIndex],
    });
  }

  public async getGivenEventsByFilter(
    chains: DbSchema[],
    where: GiveWhereInput,
  ): Promise<GivenEventModelDataValues[]> {
    return givenEventsQueries.getByFilter(chains, where);
  }
}
