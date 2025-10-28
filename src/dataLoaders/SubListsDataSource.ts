import DataLoader from 'dataloader';
import type {
  DbSchema,
  ImmutableSplitsDriverId,
  ImmutableSplitsDriverMultiChainKey,
} from '../common/types';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import type { SubListDataValues } from '../sub-list/SubListModel';
import subListsQueries from './sqlQueries/subListsQueries';

export default class SubListsDataSource {
  private readonly _batchSubListsByIds = new DataLoader(
    async (
      subListKeys: readonly ImmutableSplitsDriverMultiChainKey[],
    ): Promise<(SubListDataValues | null)[]> => {
      const { chains, ids: subListIds } = parseMultiChainKeys(subListKeys);

      const subListDataValues = await subListsQueries.getByIds(
        chains,
        subListIds,
      );

      const subListIdToDripListMap = subListDataValues.reduce<
        Record<ImmutableSplitsDriverId, SubListDataValues>
      >((mapping, subList) => {
        mapping[subList.accountId] = subList; // eslint-disable-line no-param-reassign

        return mapping;
      }, {});

      return subListKeys.map(
        ({ accountId }) => subListIdToDripListMap[accountId] || null,
      );
    },
  );

  public async getSubListsByIdsOnChain(
    ids: ImmutableSplitsDriverId[],
    chain: DbSchema,
  ): Promise<SubListDataValues[]> {
    return (
      await (this._batchSubListsByIds.loadMany(
        ids.map((id) => ({
          accountId: id,
          chains: [chain],
        })),
      ) as Promise<SubListDataValues[]>)
    ).filter((subList) => subList && subList.chain === chain);
  }
}
