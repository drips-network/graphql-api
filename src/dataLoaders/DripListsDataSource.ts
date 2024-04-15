import type { WhereOptions } from 'sequelize';
import { Op } from 'sequelize';
import DataLoader from 'dataloader';
import type { Address, DripListId } from '../common/types';
import type { DripListWhereInput } from '../generated/graphql';
import DripListModel from '../drip-list/DripListModel';
import TransferEventModel from '../drip-list/TransferEventModel';

export default class DripListsDataSource {
  private readonly _batchDripListsByIds = new DataLoader(
    async (dripListIds: readonly DripListId[]): Promise<DripListModel[]> => {
      const dripLists = await DripListModel.findAll({
        where: {
          id: {
            [Op.in]: dripListIds,
          },
          isValid: true,
        },
      });

      const dripListIdToDripListMap = dripLists.reduce<
        Record<DripListId, DripListModel>
      >((mapping, dripList) => {
        mapping[dripList.id] = dripList; // eslint-disable-line no-param-reassign

        return mapping;
      }, {});

      return dripListIds.map((id) => dripListIdToDripListMap[id]);
    },
  );

  public async getDripListById(id: DripListId): Promise<DripListModel> {
    return this._batchDripListsByIds.load(id);
  }

  public async getDripListsByFilter(
    where: DripListWhereInput,
  ): Promise<DripListModel[]> {
    const dripLists =
      (await DripListModel.findAll({
        where: (where as WhereOptions) || {},
      })) || [];

    return dripLists.filter((p) => p.isValid && p.name);
  }

  public async getDripListsByIds(ids: DripListId[]): Promise<DripListModel[]> {
    return this._batchDripListsByIds.loadMany(ids) as Promise<DripListModel[]>;
  }

  public async getMintedTokensCountByAccountId(
    ownerAddress: Address,
  ): Promise<number> {
    // TODO: Fix edge case. This will not count tokens minted by the owner but immediately transferred to another address.
    const total = await TransferEventModel.count({
      where: {
        to: ownerAddress,
      },
    });

    return total;
  }
}
