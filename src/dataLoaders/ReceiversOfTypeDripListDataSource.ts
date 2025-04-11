import DataLoader from 'dataloader';
import type {
  RepoDriverMultiChainKey,
  NftDriverId,
  RepoDriverId,
  NftDriverMultiChainKey,
  DbSchema,
} from '../common/types';
import type { DripListSplitReceiverModelDataValues } from '../models/DripListSplitReceiverModel';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import dripListSplitReceiversQueries from './sqlQueries/dripListSplitReceiversQueries';

export default class ReceiversOfTypeDripListDataSource {
  private readonly _batchReceiversOfTypeDripListByProjectIds = new DataLoader(
    async (projectKeys: readonly RepoDriverMultiChainKey[]) => {
      const { chains, ids: projectIds } = parseMultiChainKeys(projectKeys);

      const dripListSplitReceiverModelDataValues =
        await dripListSplitReceiversQueries.getByFunderProjectIds(
          chains,
          projectIds,
        );

      const receiversOfTypeDripListToProjectListMapping =
        dripListSplitReceiverModelDataValues.reduce<
          Record<RepoDriverId, DripListSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.funderProjectId as RepoDriverId]) {
            mapping[receiver.funderProjectId as RepoDriverId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.funderProjectId as RepoDriverId].push(receiver);

          return mapping;
        }, {});

      return projectIds.map(
        (id) => receiversOfTypeDripListToProjectListMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeDripListByProjectIdOnChain(
    id: RepoDriverId,
    chain: DbSchema,
  ): Promise<DripListSplitReceiverModelDataValues[]> {
    return (
      await this._batchReceiversOfTypeDripListByProjectIds.load({
        id,
        chains: [chain],
      })
    ).filter((receiver) => receiver.chain === chain);
  }

  private readonly _batchReceiversOfTypeDripListByDripListIds = new DataLoader(
    async (dripListKeys: readonly NftDriverMultiChainKey[]) => {
      const { chains, ids: dripListIds } = parseMultiChainKeys(dripListKeys);

      const dripListSplitReceiverModelDataValues =
        await dripListSplitReceiversQueries.getByFunderDripListIds(
          chains,
          dripListIds,
        );

      const receiversOfTypeDripListToDripListMapping =
        dripListSplitReceiverModelDataValues.reduce<
          Record<NftDriverId, DripListSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.funderDripListId as NftDriverId]) {
            mapping[receiver.funderDripListId as NftDriverId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.funderDripListId as NftDriverId].push(receiver);

          return mapping;
        }, {});

      return dripListIds.map(
        (id) => receiversOfTypeDripListToDripListMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeDripListByDripListIdOnChain(
    id: NftDriverId,
    chain: DbSchema,
  ): Promise<DripListSplitReceiverModelDataValues[]> {
    return (
      await this._batchReceiversOfTypeDripListByDripListIds.load({
        id,
        chains: [chain],
      })
    ).filter((receiver) => receiver.chain === chain);
  }
}
