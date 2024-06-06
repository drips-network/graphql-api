import DataLoader from 'dataloader';
import type { DripListSplitReceiverModelDataValues } from '../models/DripListSplitReceiverModel';
import type {
  AccountId,
  AddressDriverId,
  DripListId,
  DripListMultiChainKey,
  MultiChainKey,
  ProjectId,
  ProjectMultiChainKey,
} from '../common/types';
import type { GivenEventModelDataValues } from '../given-event/GivenEventModel';
import type { RepoDriverSplitReceiverModelDataValues } from '../models/RepoDriverSplitReceiverModel';
import streams from '../utils/streams';
import type { ProtoStream } from '../utils/buildAssetConfigs';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import type { SupportedChain } from '../generated/graphql';
import type { AddressDriverSplitReceiverModelDataValues } from '../models/AddressDriverSplitReceiverModel';
import addressDriverSplitReceiversQueries from './sqlQueries/addressDriverSplitReceiversQueries';
import givenEventsQueries from './sqlQueries/givenEventsQueries';
import dripListSplitReceiversQueries from './sqlQueries/dripListSplitReceiversQueries';
import repoDriverSplitReceiversQueries from './sqlQueries/repoDriverSplitReceiversQueries';

export default class ProjectAndDripListSupportDataSource {
  private readonly _batchProjectAndDripListSupportByDripListIds =
    new DataLoader(async (dripListKeys: readonly DripListMultiChainKey[]) => {
      const { chains, ids: dripListIds } = parseMultiChainKeys(dripListKeys);

      const dripListSplitReceiverModelDataValues =
        await dripListSplitReceiversQueries.getByFundeeDripListIds(
          chains,
          dripListIds,
        );

      const projectAndDripListSupportToDripListMapping =
        dripListSplitReceiverModelDataValues.reduce<
          Record<DripListId, DripListSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.fundeeDripListId]) {
            mapping[receiver.fundeeDripListId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.fundeeDripListId].push(receiver);

          return mapping;
        }, {});

      return dripListIds.map(
        (id) => projectAndDripListSupportToDripListMapping[id] || [],
      );
    });

  private readonly _batchProjectAndDripListSupportByProjectIds = new DataLoader(
    async (projectKeys: readonly ProjectMultiChainKey[]) => {
      const { chains, ids: projectIds } = parseMultiChainKeys(projectKeys);

      const repoDriverSplitReceiverModelDataValues =
        await repoDriverSplitReceiversQueries.getByFundeeProjectIds(
          chains,
          projectIds,
        );

      const projectAndDripListSupportToProjectMapping =
        repoDriverSplitReceiverModelDataValues.reduce<
          Record<ProjectId, RepoDriverSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.fundeeProjectId]) {
            mapping[receiver.fundeeProjectId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.fundeeProjectId].push(receiver);

          return mapping;
        }, {});

      return projectIds.map(
        (id) => projectAndDripListSupportToProjectMapping[id] || [],
      );
    },
  );

  private readonly _batchProjectAndDripListSupportByAddressDriverIds =
    new DataLoader(async (addressDriverKeys: readonly MultiChainKey[]) => {
      const { chains, ids: addressDriverIds } =
        parseMultiChainKeys(addressDriverKeys);

      const projectAndDripListSupport =
        await addressDriverSplitReceiversQueries.getByFundeeAccountIds(
          chains,
          addressDriverIds,
        );

      const projectAndDripListSupportToProjectMapping =
        projectAndDripListSupport.reduce<
          Record<AddressDriverId, AddressDriverSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.fundeeAccountId]) {
            mapping[receiver.fundeeAccountId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.fundeeAccountId].push(receiver);

          return mapping;
        }, {});

      return addressDriverIds.map(
        (id) =>
          projectAndDripListSupportToProjectMapping[id as AddressDriverId] ||
          [],
      );
    });

  private readonly _batchStreamSupportByAccountIds = new DataLoader(
    async (accountKeys: readonly MultiChainKey[]) => {
      const { chains, ids: accountIds } = parseMultiChainKeys(accountKeys);

      const streamsToList = (
        await Promise.all(
          accountIds.map((accountId) =>
            streams.getUserIncomingStreams(chains, accountId),
          ),
        )
      )
        .flatMap((s) =>
          Object.entries(s).map(([chain, protoStreamsForChain]) =>
            protoStreamsForChain.map((protoStream) => ({
              ...protoStream,
              chain: chain as SupportedChain,
            })),
          ),
        )
        .flat();

      const streamSupportToAccountMapping = streamsToList.reduce<
        Record<AccountId, ProtoStream[]>
      >(
        (mapping, stream) => ({
          ...mapping,
          [stream.receiver.accountId as AccountId]: [
            ...(mapping[stream.receiver.accountId as AccountId] || []),
            stream,
          ],
        }),
        {},
      ) as Record<AccountId, (ProtoStream & { chain: SupportedChain })[]>;

      return accountIds.map((id) => streamSupportToAccountMapping[id] || []);
    },
  );

  private readonly _batchOneTimeDonationSupportByAccountIds = new DataLoader(
    async (keys: readonly MultiChainKey[]) => {
      const { chains, ids } = parseMultiChainKeys(keys);

      const oneTimeDonationSupport = await givenEventsQueries.getByReceivers(
        chains,
        ids,
      );

      const oneTimeDonationSupportToDripListMapping =
        oneTimeDonationSupport.reduce<
          Record<AccountId, GivenEventModelDataValues[]>
        >((mapping, givenEvent) => {
          if (!mapping[givenEvent.receiver]) {
            mapping[givenEvent.receiver] = []; // eslint-disable-line no-param-reassign
          }

          mapping[givenEvent.receiver].push(givenEvent);

          return mapping;
        }, {});

      return ids.map((id) => oneTimeDonationSupportToDripListMapping[id] || []);
    },
  );

  public async getProjectAndDripListSupportByDripListId(
    id: DripListId,
    chains: SupportedChain[],
  ): Promise<DripListSplitReceiverModelDataValues[]> {
    return this._batchProjectAndDripListSupportByDripListIds.load({
      id,
      chains,
    });
  }

  public async getProjectAndDripListSupportByProjectId(
    id: ProjectId,
    chains: SupportedChain[],
  ): Promise<RepoDriverSplitReceiverModelDataValues[]> {
    return this._batchProjectAndDripListSupportByProjectIds.load({
      id,
      chains,
    });
  }

  public async getProjectAndDripListSupportByAddressDriverId(
    chains: SupportedChain[],
    id: AddressDriverId,
  ): Promise<AddressDriverSplitReceiverModelDataValues[]> {
    return this._batchProjectAndDripListSupportByAddressDriverIds.load({
      id,
      chains,
    });
  }

  public async getOneTimeDonationSupportByAccountId(
    chains: SupportedChain[],
    id: AccountId,
  ): Promise<GivenEventModelDataValues[]> {
    return this._batchOneTimeDonationSupportByAccountIds.load({
      id,
      chains,
    });
  }

  public async getStreamSupportByAccountId(
    chains: SupportedChain[],
    id: AccountId,
  ) {
    return this._batchStreamSupportByAccountIds.load({
      id,
      chains,
    });
  }
}
