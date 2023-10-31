import DataLoader from 'dataloader';
import { Op } from 'sequelize';
import AddressDriverSplitReceiverModel, {
  AddressDriverSplitReceiverType,
} from '../models/AddressDriverSplitReceiverModel';
import groupBy from '../utils/linq';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { ProjectAccountId } from '../common/types';
import RepoDriverSplitReceiverModel, {
  RepoDriverSplitReceiverType,
} from '../models/RepoDriverSplitReceiverModel';
import ProjectModel from './ProjectModel';
import DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';

export function projectReceiversDataLoader() {
  return new DataLoader(projectReceiversByProjectIds);
}

async function projectReceiversByProjectIds(
  projectIds: readonly ProjectAccountId[],
): Promise<RepoDriverSplitReceiverModel[][]> {
  const receivers = await RepoDriverSplitReceiverModel.findAll({
    where: {
      funderProjectId: {
        [Op.in]: projectIds,
      },
      type: RepoDriverSplitReceiverType.ProjectDependency,
    },
  });

  const receiversByProjectId = groupBy(
    receivers,
    (receiver) => receiver.funderProjectId || shouldNeverHappen(),
  );

  return projectIds.map(
    (projectId) => receiversByProjectId.get(projectId) || [],
  );
}

export function addressDriverSplitReceiversByProjectIdsDataLoader() {
  return new DataLoader(addressDriverSplitReceiversByProjectIds);
}

async function addressDriverSplitReceiversByProjectIds(
  projectIds: readonly ProjectAccountId[],
): Promise<AddressDriverSplitReceiverModel[][]> {
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

  const receiversByProjectId = groupBy(
    receivers,
    (receiver) => receiver.funderProjectId || shouldNeverHappen(),
  );

  return projectIds.map(
    (projectId) => receiversByProjectId.get(projectId) || [],
  );
}

export function repoDriverSplitReceiversByProjectIdsDataLoader() {
  return new DataLoader(repoDriverSplitReceiversByProjectIdsLoader);
}

async function repoDriverSplitReceiversByProjectIdsLoader(
  projectIds: readonly ProjectAccountId[],
): Promise<RepoDriverSplitReceiverModel[][]> {
  const receivers = await RepoDriverSplitReceiverModel.findAll({
    where: {
      funderProjectId: {
        [Op.in]: projectIds,
      },
      type: RepoDriverSplitReceiverType.ProjectDependency,
    },
  });

  const receiversByProjectId = groupBy(
    receivers,
    (receiver) => receiver.funderProjectId || shouldNeverHappen(),
  );

  return projectIds.map(
    (projectId) => receiversByProjectId.get(projectId) || [],
  );
}

export function projectsByIdsDataLoader() {
  return new DataLoader(projectsByIdsLoader);
}

async function projectsByIdsLoader(
  projectIds: readonly ProjectAccountId[],
): Promise<ProjectModel[]> {
  const projects = await ProjectModel.findAll({
    where: {
      id: {
        [Op.in]: projectIds,
      },
    },
  });

  return projectIds.map(
    (projectId) =>
      projects.find((p) => p.id === projectId) || shouldNeverHappen(),
  );
}

export function nftDriverSplitReceiversByProjectDataLoader() {
  return new DataLoader(nftDriverSplitReceiversByProjectIdsLoader);
}

async function nftDriverSplitReceiversByProjectIdsLoader(
  projectIds: readonly ProjectAccountId[],
): Promise<DripListSplitReceiverModel[][]> {
  const receivers = await DripListSplitReceiverModel.findAll({
    where: {
      funderProjectId: {
        [Op.in]: projectIds,
      },
    },
  });

  const receiversByProjectId = groupBy(
    receivers,
    (receiver) => receiver.funderProjectId || shouldNeverHappen(),
  );

  return projectIds.map(
    (projectId) => receiversByProjectId.get(projectId) || [],
  );
}
