import DataLoader from 'dataloader';
import type {
  DripListId,
  DripListMultiChainKey,
  ProjectId,
  ProjectMultiChainKey,
} from '../common/types';
import type { AddressDriverSplitReceiverModelDataValues } from '../models/AddressDriverSplitReceiverModel';
import type { SupportedChain } from '../generated/graphql';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import addressDriverSplitReceiversQueries from './sqlQueries/addressDriverSplitReceiversQueries';

export default class ReceiversOfTypeAddressDataSource {
  private readonly _batchReceiversOfTypeAddressByProjectIds = new DataLoader(
    async (projectKeys: readonly ProjectMultiChainKey[]) => {
      const { chains, ids: projectIds } = parseMultiChainKeys(projectKeys);

      const addressDriverSplitReceiverModelDataValues =
        await addressDriverSplitReceiversQueries.getProjectDependenciesByFunders(
          chains,
          projectIds,
        );

      const receiversOfTypeAddressToProjectMapping =
        addressDriverSplitReceiverModelDataValues.reduce<
          Record<ProjectId, AddressDriverSplitReceiverModelDataValues[]>
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
    chains: SupportedChain[],
  ): Promise<AddressDriverSplitReceiverModelDataValues[]> {
    return this._batchReceiversOfTypeAddressByProjectIds.load({
      id,
      chains,
    });
  }

  private readonly _batchReceiversOfTypeAddressByDripListIds = new DataLoader(
    async (dripListKeys: readonly DripListMultiChainKey[]) => {
      const { chains, ids: dripListIds } = parseMultiChainKeys(dripListKeys);

      const addressDriverSplitReceiverModelDataValues =
        await addressDriverSplitReceiversQueries.getDripListDependenciesByFunders(
          chains,
          dripListIds,
        );

      const receiversOfTypeAddressToDripListMapping =
        addressDriverSplitReceiverModelDataValues.reduce<
          Record<DripListId, AddressDriverSplitReceiverModelDataValues[]>
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
    chains: SupportedChain[],
  ): Promise<AddressDriverSplitReceiverModelDataValues[]> {
    return this._batchReceiversOfTypeAddressByDripListIds.load({
      id,
      chains,
    });
  }
}
