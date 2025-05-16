/* eslint-disable no-param-reassign */
import DataLoader from 'dataloader';
import type {
  AccountId,
  DbSchema,
  NftDriverId,
  NftDriverMultiChainKey,
  RepoDriverId,
  RepoDriverMultiChainKey,
} from '../common/types';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import type { SplitEventModelDataValues } from '../models/SplitEventModel';
import type { GivenEventModelDataValues } from '../given-event/GivenEventModel';
import { isNftDriverId, isRepoDriverId } from '../utils/assert';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import givenEventsQueries from './sqlQueries/givenEventsQueries';
import splitEventsQueries from './sqlQueries/splitEventsQueries';

export default class TotalEarnedDataSource {
  private readonly _batchTotalEarnedByAccountIds = new DataLoader(
    async (
      keys: readonly (NftDriverMultiChainKey | RepoDriverMultiChainKey)[],
    ) => {
      const { chains, ids: accountIds } = parseMultiChainKeys(keys);

      const givenEventModelDataValues = await givenEventsQueries.getByReceivers(
        chains,
        accountIds,
      );

      const splitEventModelDataValues =
        await splitEventsQueries.getByProjectReceivers(chains, accountIds);

      const splitEventsByAccountId = splitEventModelDataValues.reduce<
        Record<AccountId, SplitEventModelDataValues[]>
      >((mapping, event) => {
        if (!mapping[event.receiver]) {
          mapping[event.receiver] = [];
        }

        mapping[event.receiver].push(event);

        return mapping;
      }, {});

      const givenEventsByAccountId = givenEventModelDataValues.reduce<
        Record<AccountId, GivenEventModelDataValues[]>
      >((mapping, event) => {
        if (!mapping[event.receiver]) {
          mapping[event.receiver] = [];
        }

        mapping[event.receiver].push(event);

        return mapping;
      }, {});

      return accountIds.map((id) => ({
        splitEventsForAccountDataValues: splitEventsByAccountId[id] || [],
        givenEventsForAccountDataValues: givenEventsByAccountId[id] || [],
      }));
    },
  );

  public async getTotalEarnedByAccountIds(
    accountId: NftDriverId | RepoDriverId,
    chains: DbSchema[],
  ): Promise<{
    splitEventsForAccountDataValues: SplitEventModelDataValues[];
    givenEventsForAccountDataValues: GivenEventModelDataValues[];
  }> {
    // eslint-disable-next-line no-nested-ternary
    const key = isNftDriverId(accountId)
      ? { accountId, chains }
      : isRepoDriverId(accountId)
        ? { accountId, chains }
        : shouldNeverHappen();

    return this._batchTotalEarnedByAccountIds.load(key);
  }
}
