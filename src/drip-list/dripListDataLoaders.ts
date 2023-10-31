import DataLoader from 'dataloader';
import { Op } from 'sequelize';
import AddressDriverSplitReceiverModel, {
  AddressDriverSplitReceiverType,
} from '../models/AddressDriverSplitReceiverModel';
import groupBy from '../utils/linq';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { DripListAccountId } from '../common/types';
import RepoDriverSplitReceiverModel, {
  RepoDriverSplitReceiverType,
} from '../models/RepoDriverSplitReceiverModel';
import DripListModel from './DripListModel';
import DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';

export function dripListProjectReceiversDataLoader() {
  return new DataLoader(dripListProjectReceiversByDripListIds);
}

async function dripListProjectReceiversByDripListIds(
  dripListIds: readonly DripListAccountId[],
): Promise<RepoDriverSplitReceiverModel[][]> {
  const receivers = await RepoDriverSplitReceiverModel.findAll({
    where: {
      funderDripListId: {
        [Op.in]: dripListIds,
      },
      type: RepoDriverSplitReceiverType.DripListDependency,
    },
  });

  const receiversByDripListId = groupBy(
    receivers,
    (receiver) => receiver.funderDripListId || shouldNeverHappen(),
  );

  return dripListIds.map(
    (dripListId) => receiversByDripListId.get(dripListId) || [],
  );
}

export function addressDriverSplitReceiversByDripListIdsDataLoader() {
  return new DataLoader(addressDriverSplitReceiversByDripListIds);
}

async function addressDriverSplitReceiversByDripListIds(
  dripListIds: readonly DripListAccountId[],
): Promise<AddressDriverSplitReceiverModel[][]> {
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

  const receiversByDripListId = groupBy(
    receivers,
    (receiver) => receiver.funderDripListId || shouldNeverHappen(),
  );

  return dripListIds.map(
    (dripListId) => receiversByDripListId.get(dripListId) || [],
  );
}

export function repoDriverSplitReceiversByDripListIdsDataLoader() {
  return new DataLoader(repoDriverSplitReceiversByDripListIdsLoader);
}

async function repoDriverSplitReceiversByDripListIdsLoader(
  dripListIds: readonly DripListAccountId[],
): Promise<RepoDriverSplitReceiverModel[][]> {
  const receivers = await RepoDriverSplitReceiverModel.findAll({
    where: {
      funderDripListId: {
        [Op.in]: dripListIds,
      },
      type: RepoDriverSplitReceiverType.DripListDependency,
    },
  });

  const receiversByDripListId = groupBy(
    receivers,
    (receiver) => receiver.funderDripListId || shouldNeverHappen(),
  );

  return dripListIds.map(
    (dripListId) => receiversByDripListId.get(dripListId) || [],
  );
}

export function nftDriverSplitReceiversByDripListIdsDataLoader() {
  return new DataLoader(nftDriverSplitReceiversByDripListIdsLoader);
}

async function nftDriverSplitReceiversByDripListIdsLoader(
  dripListIds: readonly DripListAccountId[],
): Promise<DripListSplitReceiverModel[][]> {
  const receivers = await DripListSplitReceiverModel.findAll({
    where: {
      funderDripListId: {
        [Op.in]: dripListIds,
      },
    },
  });

  const receiversByDripListId = groupBy(
    receivers,
    (receiver) => receiver.funderDripListId || shouldNeverHappen(),
  );

  return dripListIds.map(
    (dripListId) => receiversByDripListId.get(dripListId) || [],
  );
}

export function dripListsByIdsDataLoader() {
  return new DataLoader(dripListsByIdsLoader);
}

async function dripListsByIdsLoader(
  dripListIds: readonly DripListAccountId[],
): Promise<DripListModel[]> {
  const dripLists = await DripListModel.findAll({
    where: {
      id: {
        [Op.in]: dripListIds,
      },
    },
  });

  return dripListIds.map(
    (dripListId) =>
      dripLists.find((l) => l.id === dripListId) || shouldNeverHappen(),
  );
}
