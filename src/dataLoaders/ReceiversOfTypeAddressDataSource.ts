import DataLoader from 'dataloader';
import type {
  DbSchema,
  NftDriverId,
  NftDriverMultiChainKey,
  RepoDriverId,
  RepoDriverMultiChainKey,
} from '../common/types';
import type { AddressDriverSplitReceiverModelDataValues } from '../models/AddressDriverSplitReceiverModel';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import addressDriverSplitReceiversQueries from './sqlQueries/addressDriverSplitReceiversQueries';

export default class ReceiversOfTypeAddressDataSource {
  private readonly _batchReceiversOfTypeAddressByProjectIds = new DataLoader(
    async (projectKeys: readonly RepoDriverMultiChainKey[]) => {
      const { chains, ids: projectIds } = parseMultiChainKeys(projectKeys);

      const addressDriverSplitReceiverModelDataValues =
        await addressDriverSplitReceiversQueries.getProjectDependenciesByFunders(
          chains,
          projectIds,
        );

      const receiversOfTypeAddressToProjectMapping =
        addressDriverSplitReceiverModelDataValues.reduce<
          Record<RepoDriverId, AddressDriverSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.funderProjectId as RepoDriverId]) {
            mapping[receiver.funderProjectId as RepoDriverId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.funderProjectId as RepoDriverId].push(receiver);

          return mapping;
        }, {});

      return projectIds.map(
        (id) => receiversOfTypeAddressToProjectMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeAddressByProjectIdOnChain(
    id: RepoDriverId,
    chain: DbSchema,
  ): Promise<AddressDriverSplitReceiverModelDataValues[]> {
    return (
      await this._batchReceiversOfTypeAddressByProjectIds.load({
        id,
        chains: [chain],
      })
    ).filter((receiver) => receiver.chain === chain);
  }

  private readonly _batchReceiversOfTypeAddressByDripListIds = new DataLoader(
    async (dripListKeys: readonly NftDriverMultiChainKey[]) => {
      const { chains, ids: dripListIds } = parseMultiChainKeys(dripListKeys);

      const addressDriverSplitReceiverModelDataValues =
        await addressDriverSplitReceiversQueries.getDripListDependenciesByFunders(
          chains,
          dripListIds,
        );

      const receiversOfTypeAddressToDripListMapping =
        addressDriverSplitReceiverModelDataValues.reduce<
          Record<NftDriverId, AddressDriverSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.funderDripListId as NftDriverId]) {
            mapping[receiver.funderDripListId as NftDriverId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.funderDripListId as NftDriverId].push(receiver);

          return mapping;
        }, {});

      return dripListIds.map(
        (id) => receiversOfTypeAddressToDripListMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeAddressByDripListIdOnChain(
    id: NftDriverId,
    chain: DbSchema,
  ): Promise<AddressDriverSplitReceiverModelDataValues[]> {
    return (
      await this._batchReceiversOfTypeAddressByDripListIds.load({
        id,
        chains: [chain],
      })
    ).filter((receiver) => receiver.chain === chain);
  }
}
