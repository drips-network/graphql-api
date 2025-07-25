/* eslint-disable no-param-reassign */
import DataLoader from 'dataloader';
import type {
  AccountId,
  DbSchema,
  DripListId,
  DripListMultiChainKey,
  ProjectId,
  ProjectMultiChainKey,
} from '../common/types';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import type { SplitEventModelDataValues } from '../models/SplitEventModel';
import type { GivenEventModelDataValues } from '../given-event/GivenEventModel';
import { isDripListId, isProjectId } from '../utils/assert';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import givenEventsQueries from './sqlQueries/givenEventsQueries';
import splitEventsQueries from './sqlQueries/splitEventsQueries';

export default class TotalEarnedDataSource {
  private readonly _batchTotalEarnedByProjectIds = new DataLoader(
    async (keys: readonly (DripListMultiChainKey | ProjectMultiChainKey)[]) => {
      const { chains, ids: projectIds } = parseMultiChainKeys(keys);

      const givenEventModelDataValues = await givenEventsQueries.getByReceivers(
        chains,
        projectIds,
      );

      const splitEventModelDataValues =
        await splitEventsQueries.getByProjectReceivers(chains, projectIds);

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
    chains: DbSchema[],
  ): Promise<{
    splitEventsForDripListDataValues: SplitEventModelDataValues[];
    givenEventsForDripListDataValues: GivenEventModelDataValues[];
  }> {
    // eslint-disable-next-line no-nested-ternary
    const key = isDripListId(id)
      ? { id, chains }
      : isProjectId(id)
        ? { id, chains }
        : shouldNeverHappen();

    return this._batchTotalEarnedByProjectIds.load(key);
  }
}
