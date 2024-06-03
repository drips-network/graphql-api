import DataLoader from 'dataloader';
import { Op } from 'sequelize';
import type {
  AccountId,
  AddressDriverId,
  DripListId,
  ProjectId,
} from '../common/types';
import DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';
import GivenEventModel from '../given-event/GivenEventModel';
import RepoDriverSplitReceiverModel from '../models/RepoDriverSplitReceiverModel';
import streams from '../utils/streams';
import type { ProtoStream } from '../utils/buildAssetConfigs';
import AddressDriverSplitReceiverModel from '../models/AddressDriverSplitReceiverModel';

export default class ProjectAndDripListSupportDataSource {
  private readonly _batchProjectAndDripListSupportByDripListIds =
    new DataLoader(async (dripListIds: readonly DripListId[]) => {
      const projectAndDripListSupport =
        await DripListSplitReceiverModel.findAll({
          where: {
            fundeeDripListId: {
              [Op.in]: dripListIds,
            },
          },
        });

      const projectAndDripListSupportToDripListMapping =
        projectAndDripListSupport.reduce<
          Record<DripListId, DripListSplitReceiverModel[]>
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
    async (projectIds: readonly ProjectId[]) => {
      const projectAndDripListSupport =
        await RepoDriverSplitReceiverModel.findAll({
          where: {
            fundeeProjectId: {
              [Op.in]: projectIds,
            },
          },
        });

      const projectAndDripListSupportToProjectMapping =
        projectAndDripListSupport.reduce<
          Record<ProjectId, RepoDriverSplitReceiverModel[]>
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
    new DataLoader(async (addressDriverIds: readonly AddressDriverId[]) => {
      const projectAndDripListSupport =
        await AddressDriverSplitReceiverModel.findAll({
          where: {
            fundeeAccountId: {
              [Op.in]: addressDriverIds,
            },
          },
        });

      const projectAndDripListSupportToProjectMapping =
        projectAndDripListSupport.reduce<
          Record<AddressDriverId, AddressDriverSplitReceiverModel[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.fundeeAccountId]) {
            mapping[receiver.fundeeAccountId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.fundeeAccountId].push(receiver);

          return mapping;
        }, {});

      return addressDriverIds.map(
        (id) => projectAndDripListSupportToProjectMapping[id] || [],
      );
    });

  private readonly _batchStreamSupportByAccountIds = new DataLoader(
    async (accountIds: readonly AccountId[]) => {
      const streamsToList = (
        await Promise.all(
          accountIds.map((accountId) =>
            streams.getUserIncomingStreams(accountId),
          ),
        )
      ).flat();

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
      );

      return accountIds.map((id) => streamSupportToAccountMapping[id] || []);
    },
  );

  private readonly _batchOneTimeDonationSupportByAccountIds = new DataLoader(
    async (dripListIds: readonly AccountId[]) => {
      const oneTimeDonationSupport = await GivenEventModel.findAll({
        where: {
          receiver: {
            [Op.in]: dripListIds,
          },
        },
      });

      const oneTimeDonationSupportToDripListMapping =
        oneTimeDonationSupport.reduce<Record<AccountId, GivenEventModel[]>>(
          (mapping, givenEvent) => {
            if (!mapping[givenEvent.receiver]) {
              mapping[givenEvent.receiver] = []; // eslint-disable-line no-param-reassign
            }

            mapping[givenEvent.receiver].push(givenEvent);

            return mapping;
          },
          {},
        );

      return dripListIds.map(
        (id) => oneTimeDonationSupportToDripListMapping[id] || [],
      );
    },
  );

  public async getProjectAndDripListSupportByDripListId(
    id: DripListId,
  ): Promise<DripListSplitReceiverModel[]> {
    return this._batchProjectAndDripListSupportByDripListIds.load(id);
  }

  public async getProjectAndDripListSupportByProjectId(
    id: ProjectId,
  ): Promise<RepoDriverSplitReceiverModel[]> {
    return this._batchProjectAndDripListSupportByProjectIds.load(id);
  }

  public async getProjectAndDripListSupportByAddressDriverId(
    id: AddressDriverId,
  ): Promise<AddressDriverSplitReceiverModel[]> {
    return this._batchProjectAndDripListSupportByAddressDriverIds.load(id);
  }

  public async getOneTimeDonationSupportByAccountId(
    id: AccountId,
  ): Promise<GivenEventModel[]> {
    return this._batchOneTimeDonationSupportByAccountIds.load(id);
  }

  public async getStreamSupportByAccountId(
    id: AccountId,
  ): Promise<ProtoStream[]> {
    return this._batchStreamSupportByAccountIds.load(id);
  }
}
