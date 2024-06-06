import DataLoader from 'dataloader';
import type {
  ProjectMultiChainKey,
  DripListId,
  ProjectId,
  DripListMultiChainKey,
} from '../common/types';
import type { DripListSplitReceiverModelDataValues } from '../models/DripListSplitReceiverModel';
import type { SupportedChain } from '../generated/graphql';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import dripListSplitReceiversQueries from './sqlQueries/dripListSplitReceiversQueries';

export default class ReceiversOfTypeDripListDataSource {
  private readonly _batchReceiversOfTypeDripListByProjectIds = new DataLoader(
    async (projectKeys: readonly ProjectMultiChainKey[]) => {
      const { chains, ids: projectIds } = parseMultiChainKeys(projectKeys);

      const dripListSplitReceiverModelDataValues =
        await dripListSplitReceiversQueries.getByFunderProjectIds(
          chains,
          projectIds,
        );

      const receiversOfTypeDripListToProjectListMapping =
        dripListSplitReceiverModelDataValues.reduce<
          Record<ProjectId, DripListSplitReceiverModelDataValues[]>
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
    },
  );

  public async getReceiversOfTypeDripListByProjectId(
    id: ProjectId,
    chains: SupportedChain[],
  ): Promise<DripListSplitReceiverModelDataValues[]> {
    return this._batchReceiversOfTypeDripListByProjectIds.load({
      id,
      chains,
    });
  }

  private readonly _batchReceiversOfTypeDripListByDripListIds = new DataLoader(
    async (dripListKeys: readonly DripListMultiChainKey[]) => {
      const { chains, ids: dripListIds } = parseMultiChainKeys(dripListKeys);

      const dripListSplitReceiverModelDataValues =
        await dripListSplitReceiversQueries.getByFunderDripListIds(
          chains,
          dripListIds,
        );

      const receiversOfTypeDripListToDripListMapping =
        dripListSplitReceiverModelDataValues.reduce<
          Record<DripListId, DripListSplitReceiverModelDataValues[]>
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
    chains: SupportedChain[],
  ): Promise<DripListSplitReceiverModelDataValues[]> {
    return this._batchReceiversOfTypeDripListByDripListIds.load({
      id,
      chains,
    });
  }
}
