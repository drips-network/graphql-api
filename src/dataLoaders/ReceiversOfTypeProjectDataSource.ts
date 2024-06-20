import DataLoader from 'dataloader';
import type {
  DripListMultiChainKey,
  DripListId,
  ProjectId,
  ProjectMultiChainKey,
  DbSchema,
} from '../common/types';
import type { RepoDriverSplitReceiverModelDataValues } from '../models/RepoDriverSplitReceiverModel';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import repoDriverSplitReceiversQueries from './sqlQueries/repoDriverSplitReceiversQueries';

export default class ReceiversOfTypeProjectDataSource {
  private readonly _batchReceiversOfTypeProjectByProjectIds = new DataLoader(
    async (projectKeys: readonly ProjectMultiChainKey[]) => {
      const { chains, ids: projectIds } = parseMultiChainKeys(projectKeys);

      const repoDriverSplitReceiverModelDataValues =
        await repoDriverSplitReceiversQueries.getByFunderProjectIds(
          chains,
          projectIds,
        );

      const receiversOfTypeProjectToProjectMapping =
        repoDriverSplitReceiverModelDataValues.reduce<
          Record<ProjectId, RepoDriverSplitReceiverModelDataValues[]>
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

  public async getReceiversOfTypeProjectByProjectIdOnChain(
    id: ProjectId,
    chain: DbSchema,
  ): Promise<RepoDriverSplitReceiverModelDataValues[]> {
    return (
      await this._batchReceiversOfTypeProjectByProjectIds.load({
        id,
        chains: [chain],
      })
    ).filter((receiver) => receiver.chain === chain);
  }

  private readonly _batchReceiversOfTypeProjectByDripListIds = new DataLoader(
    async (dripListKeys: readonly DripListMultiChainKey[]) => {
      const { chains, ids: dripListIds } = parseMultiChainKeys(dripListKeys);

      const repoDriverSplitReceiverModelDataValues =
        await repoDriverSplitReceiversQueries.getByFunderDripListIds(
          chains,
          dripListIds,
        );

      const receiversOfTypeProjectToDripListMapping =
        repoDriverSplitReceiverModelDataValues.reduce<
          Record<DripListId, RepoDriverSplitReceiverModelDataValues[]>
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

  public async getReceiversOfTypeProjectByDripListIdOnChain(
    id: DripListId,
    chain: DbSchema,
  ): Promise<RepoDriverSplitReceiverModelDataValues[]> {
    return (
      await this._batchReceiversOfTypeProjectByDripListIds.load({
        id,
        chains: [chain],
      })
    ).filter((receiver) => receiver.chain === chain);
  }
}
