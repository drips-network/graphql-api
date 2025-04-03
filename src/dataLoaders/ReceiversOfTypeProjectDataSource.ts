import DataLoader from 'dataloader';
import type {
  NftDriverMultiChainKey,
  NftDriverId,
  RepoDriverId,
  RepoDriverMultiChainKey,
  DbSchema,
} from '../common/types';
import type { RepoDriverSplitReceiverModelDataValues } from '../models/RepoDriverSplitReceiverModel';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import repoDriverSplitReceiversQueries from './sqlQueries/repoDriverSplitReceiversQueries';

export default class ReceiversOfTypeProjectDataSource {
  private readonly _batchReceiversOfTypeProjectByProjectIds = new DataLoader(
    async (projectKeys: readonly RepoDriverMultiChainKey[]) => {
      const { chains, ids: projectIds } = parseMultiChainKeys(projectKeys);

      const repoDriverSplitReceiverModelDataValues =
        await repoDriverSplitReceiversQueries.getByFunderProjectIds(
          chains,
          projectIds,
        );

      const receiversOfTypeProjectToProjectMapping =
        repoDriverSplitReceiverModelDataValues.reduce<
          Record<RepoDriverId, RepoDriverSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.funderProjectId as RepoDriverId]) {
            mapping[receiver.funderProjectId as RepoDriverId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.funderProjectId as RepoDriverId].push(receiver);

          return mapping;
        }, {});

      return projectIds.map(
        (id) => receiversOfTypeProjectToProjectMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeProjectByProjectIdOnChain(
    id: RepoDriverId,
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
    async (dripListKeys: readonly NftDriverMultiChainKey[]) => {
      const { chains, ids: dripListIds } = parseMultiChainKeys(dripListKeys);

      const repoDriverSplitReceiverModelDataValues =
        await repoDriverSplitReceiversQueries.getByFunderDripListIds(
          chains,
          dripListIds,
        );

      const receiversOfTypeProjectToDripListMapping =
        repoDriverSplitReceiverModelDataValues.reduce<
          Record<NftDriverId, RepoDriverSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.funderDripListId as NftDriverId]) {
            mapping[receiver.funderDripListId as NftDriverId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.funderDripListId as NftDriverId].push(receiver);

          return mapping;
        }, {});

      return dripListIds.map(
        (id) => receiversOfTypeProjectToDripListMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeProjectByDripListIdOnChain(
    id: NftDriverId,
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
