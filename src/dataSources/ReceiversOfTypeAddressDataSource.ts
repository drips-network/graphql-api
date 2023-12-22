import DataLoader from 'dataloader';
import { Op } from 'sequelize';
import type { DripListId, ProjectId } from '../common/types';
import AddressDriverSplitReceiverModel, {
  AddressDriverSplitReceiverType,
} from '../models/AddressDriverSplitReceiverModel';

export default class ReceiversOfTypeAddressDataSource {
  private readonly _batchReceiversOfTypeAddressByProjectIds = new DataLoader(
    async (projectIds: readonly ProjectId[]) => {
      const receivers = await AddressDriverSplitReceiverModel.findAll({
        where: {
          funderProjectId: {
            [Op.in]: projectIds,
          },
          type: {
            [Op.in]: [
              AddressDriverSplitReceiverType.ProjectMaintainer,
              AddressDriverSplitReceiverType.ProjectDependency,
            ],
          },
        },
      });

      const receiversOfTypeAddressToProjectMapping = receivers.reduce<
        Record<ProjectId, AddressDriverSplitReceiverModel[]>
      >((mapping, receiver) => {
        if (!mapping[receiver.funderProjectId as ProjectId]) {
          mapping[receiver.funderProjectId as ProjectId] = []; // eslint-disable-line no-param-reassign
        }

        mapping[receiver.funderProjectId as ProjectId].push(receiver);

        return mapping;
      }, {});

      return projectIds.map(
        (id) => receiversOfTypeAddressToProjectMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeAddressByProjectId(
    id: ProjectId,
  ): Promise<AddressDriverSplitReceiverModel[]> {
    return this._batchReceiversOfTypeAddressByProjectIds.load(id);
  }

  private readonly _batchReceiversOfTypeAddressByDripListIds = new DataLoader(
    async (dripListIds: readonly DripListId[]) => {
      const receivers = await AddressDriverSplitReceiverModel.findAll({
        where: {
          funderDripListId: {
            [Op.in]: dripListIds,
          },
          type: {
            [Op.in]: [AddressDriverSplitReceiverType.DripListDependency],
          },
        },
      });

      const receiversOfTypeAddressToDripListMapping = receivers.reduce<
        Record<DripListId, AddressDriverSplitReceiverModel[]>
      >((mapping, receiver) => {
        if (!mapping[receiver.funderDripListId as DripListId]) {
          mapping[receiver.funderDripListId as DripListId] = []; // eslint-disable-line no-param-reassign
        }

        mapping[receiver.funderDripListId as DripListId].push(receiver);

        return mapping;
      }, {});

      return dripListIds.map(
        (id) => receiversOfTypeAddressToDripListMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeAddressByDripListId(
    id: DripListId,
  ): Promise<AddressDriverSplitReceiverModel[]> {
    return this._batchReceiversOfTypeAddressByDripListIds.load(id);
  }
}
