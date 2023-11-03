import DataLoader from 'dataloader';
import { Op } from 'sequelize';
import type { DripListId, ProjectId } from '../common/types';
import DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';

export default class ReceiversOfTypeDripListDataSource {
  private readonly _batchReceiversOfTypeDripListByProjectListIds =
    new DataLoader(async (projectIds: readonly ProjectId[]) => {
      const receivers = await DripListSplitReceiverModel.findAll({
        where: {
          funderDripListId: {
            [Op.in]: projectIds,
          },
        },
      });

      const receiversOfTypeDripListToProjectListMapping = receivers.reduce<
        Record<ProjectId, DripListSplitReceiverModel[]>
      >((mapping, receiver) => {
        if (!mapping[receiver.funderProjectId as ProjectId]) {
          mapping[receiver.funderProjectId as ProjectId] = []; // eslint-disable-line no-param-reassign
        }

        mapping[receiver.funderProjectId as ProjectId].push(receiver);

        return mapping;
      }, {});

      return projectIds.map(
        (id) => receiversOfTypeDripListToProjectListMapping[id] || [],
      );
    });

  public async getReceiversOfTypeDripListByProjectId(
    id: ProjectId,
  ): Promise<DripListSplitReceiverModel[]> {
    return this._batchReceiversOfTypeDripListByProjectListIds.load(id);
  }

  private readonly _batchReceiversOfTypeDripListByDripListIds = new DataLoader(
    async (dripListIds: readonly DripListId[]) => {
      const receivers = await DripListSplitReceiverModel.findAll({
        where: {
          funderDripListId: {
            [Op.in]: dripListIds,
          },
        },
      });

      const receiversOfTypeDripListToDripListMapping = receivers.reduce<
        Record<DripListId, DripListSplitReceiverModel[]>
      >((mapping, receiver) => {
        if (!mapping[receiver.funderDripListId as DripListId]) {
          mapping[receiver.funderDripListId as DripListId] = []; // eslint-disable-line no-param-reassign
        }

        mapping[receiver.funderDripListId as DripListId].push(receiver);

        return mapping;
      }, {});

      return dripListIds.map(
        (id) => receiversOfTypeDripListToDripListMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeDripListByDripListId(
    id: DripListId,
  ): Promise<DripListSplitReceiverModel[]> {
    return this._batchReceiversOfTypeDripListByDripListIds.load(id);
  }
}
