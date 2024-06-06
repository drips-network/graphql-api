/* eslint-disable no-param-reassign */

import DataLoader from 'dataloader';
import type { GiveWhereInput, SupportedChain } from '../generated/graphql';
import type { GivenEventModelDataValues } from '../given-event/GivenEventModel';
import givenEventsQueries from './sqlQueries/givenEventsQueries';

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
    return givenEventsQueries.getByFilter(chains, where);
  }
}
