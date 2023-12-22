import DataLoader from 'dataloader';
import { Op } from 'sequelize';
import {
  DependencyType,
  type DripListId,
  type ProjectId,
} from '../common/types';
import RepoDriverSplitReceiverModel from '../models/RepoDriverSplitReceiverModel';

export default class ReceiversOfTypeProjectDataSource {
  private readonly _batchReceiversOfTypeProjectByProjectIds = new DataLoader(
    async (projectIds: readonly ProjectId[]) => {
      const receivers = await RepoDriverSplitReceiverModel.findAll({
        where: {
          funderProjectId: {
            [Op.in]: projectIds,
          },
          type: DependencyType.ProjectDependency,
        },
      });

      const receiversOfTypeProjectToProjectMapping = receivers.reduce<
        Record<ProjectId, RepoDriverSplitReceiverModel[]>
      >((mapping, receiver) => {
        if (!mapping[receiver.funderProjectId as ProjectId]) {
          mapping[receiver.funderProjectId as ProjectId] = []; // eslint-disable-line no-param-reassign
        }

        mapping[receiver.funderProjectId as ProjectId].push(receiver);

        return mapping;
      }, {});

      return projectIds.map(
        (id) => receiversOfTypeProjectToProjectMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeProjectByProjectId(
    id: ProjectId,
  ): Promise<RepoDriverSplitReceiverModel[]> {
    return this._batchReceiversOfTypeProjectByProjectIds.load(id);
  }

  private readonly _batchReceiversOfTypeProjectByDripListIds = new DataLoader(
    async (dripListIds: readonly DripListId[]) => {
      const receivers = await RepoDriverSplitReceiverModel.findAll({
        where: {
          funderDripListId: {
            [Op.in]: dripListIds,
          },
          type: DependencyType.DripListDependency,
        },
      });

      const receiversOfTypeProjectToDripListMapping = receivers.reduce<
        Record<DripListId, RepoDriverSplitReceiverModel[]>
      >((mapping, receiver) => {
        if (!mapping[receiver.funderDripListId as DripListId]) {
          mapping[receiver.funderDripListId as DripListId] = []; // eslint-disable-line no-param-reassign
        }

        mapping[receiver.funderDripListId as DripListId].push(receiver);

        return mapping;
      }, {});

      return dripListIds.map(
        (id) => receiversOfTypeProjectToDripListMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeProjectByDripListId(
    id: DripListId,
  ): Promise<RepoDriverSplitReceiverModel[]> {
    return this._batchReceiversOfTypeProjectByDripListIds.load(id);
  }
}
