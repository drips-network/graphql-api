import DataLoader from 'dataloader';
import type {
  Address,
  DbSchema,
  NftDriverId,
  NftDriverMultiChainKey,
} from '../common/types';
import type { DripListWhereInput, SupportedChain } from '../generated/graphql';
import type { DripListDataValues } from '../drip-list/DripListModel';
import TransferEventModel from '../drip-list/TransferEventModel';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import dripListsQueries from './sqlQueries/dripListsQueries';
import { dbSchemaToChain } from '../utils/chainSchemaMappings';

export default class DripListsDataSource {
  private readonly _batchDripListsByIds = new DataLoader(
    async (
      dripListKeys: readonly NftDriverMultiChainKey[],
    ): Promise<(DripListDataValues | null)[]> => {
      const { chains, ids: dripListIds } = parseMultiChainKeys(dripListKeys);

      const dripListDataValues = await dripListsQueries.getByIds(
        chains,
        dripListIds,
      );

      const dripListIdToDripListMap = dripListDataValues.reduce<
        Record<NftDriverId, DripListDataValues>
      >((mapping, dripList) => {
        mapping[dripList.id] = dripList; // eslint-disable-line no-param-reassign

        return mapping;
      }, {});

      return dripListKeys.map(({ id }) => dripListIdToDripListMap[id] || null);
    },
  );

  public async getDripListById(
    id: NftDriverId,
    chains: DbSchema[],
  ): Promise<DripListDataValues | null> {
    return this._batchDripListsByIds.load({
      id,
      chains,
    });
  }

  public async getDripListsByFilter(
    chains: DbSchema[],
    where?: DripListWhereInput,
  ): Promise<DripListDataValues[]> {
    return dripListsQueries.getByFilter(chains, where);
  }

  public async getDripListsByIdsOnChain(
    ids: NftDriverId[],
    chain: DbSchema,
  ): Promise<DripListDataValues[]> {
    return (
      await (this._batchDripListsByIds.loadMany(
        ids.map((id) => ({
          id,
          chains: [chain],
        })),
      ) as Promise<DripListDataValues[]>)
    ).filter((dripList) => dripList.chain === chain);
  }

  public async getMintedTokensCountByAccountId(
    chain: DbSchema,
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
      chain: dbSchemaToChain[chain],
      total,
    };
  }
}
