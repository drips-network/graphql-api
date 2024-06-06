import DataLoader from 'dataloader';
import type {
  Address,
  DripListId,
  DripListMultiChainKey,
} from '../common/types';
import type { DripListWhereInput, SupportedChain } from '../generated/graphql';
import type { DripListDataValues } from '../drip-list/DripListModel';
import TransferEventModel from '../drip-list/TransferEventModel';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import dripListsQueries from './sqlQueries/dripListsQueries';

export default class DripListsDataSource {
  private readonly _batchDripListsByIds = new DataLoader(
    async (
      dripListKeys: readonly DripListMultiChainKey[],
    ): Promise<DripListDataValues[]> => {
      const { chains, ids: dripListIds } = parseMultiChainKeys(dripListKeys);

      const dripListDataValues = await dripListsQueries.getByIds(
        chains,
        dripListIds,
      );

      const dripListIdToDripListMap = dripListDataValues.reduce<
        Record<DripListId, DripListDataValues>
      >((mapping, dripList) => {
        mapping[dripList.id] = dripList; // eslint-disable-line no-param-reassign

        return mapping;
      }, {});

      return dripListIds.map((id) => dripListIdToDripListMap[id]);
    },
  );

  public async getDripListById(
    chains: SupportedChain[],
    id: DripListId,
  ): Promise<DripListDataValues> {
    return this._batchDripListsByIds.load({
      id,
      chains,
    });
  }

  public async getDripListsByFilter(
    chains: SupportedChain[],
    where?: DripListWhereInput,
  ): Promise<DripListDataValues[]> {
    return dripListsQueries.getByFilter(chains, where);
  }

  public async getDripListsByIds(
    ids: DripListId[],
    chains: SupportedChain[],
  ): Promise<DripListDataValues[]> {
    return this._batchDripListsByIds.loadMany(
      ids.map((id) => ({
        id,
        chains,
      })),
    ) as Promise<DripListDataValues[]>;
  }

  public async getMintedTokensCountByAccountId(
    chain: SupportedChain,
    ownerAddress: Address,
  ): Promise<{
    chain: SupportedChain;
    total: number;
  }> {
    // TODO: Fix edge case. This will not count tokens minted by the owner but immediately transferred to another address.
    const total = await TransferEventModel.schema(chain).count({
      where: {
        to: ownerAddress,
      },
    });

    return {
      chain,
      total,
    };
  }
}
