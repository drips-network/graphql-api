import { ethers } from 'ethers';
import type { FakeUnclaimedProject, Forge, ProjectId } from '../common/types';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type ProjectModel from './ProjectModel';
import { ProjectVerificationStatus } from './ProjectModel';
import { RepoDriver__factory } from '../generated/contracts';
import assert from '../utils/assert';
import appSettings from '../common/appSettings';
import provider from '../common/provider';

export function splitProjectName(projectName: string): {
  ownerName: string;
  repoName: string;
} {
  const components = projectName.split('/');

  if (components.length !== 2) {
    throw new Error(`Invalid project name: ${projectName}.`);
  }

  return { ownerName: components[0], repoName: components[1] };
}

export function isValidateProjectName(name: string): boolean {
  const components = name.split('/');

  if (components.length !== 2) {
    return false;
  }

  const ownerName = components[0];
  const repoName = components[1];

  const validProjectNameRegex: RegExp = /^[\w.-]+$/;

  if (
    !validProjectNameRegex.test(ownerName) ||
    !validProjectNameRegex.test(repoName)
  ) {
    return false;
  }

  return true;
}

function toContractForge(forge: Forge): 0 | 1 {
  switch (forge) {
    case `GitHub`:
      return 0;
    case `GitLab`:
      return 1;
    default:
      return shouldNeverHappen(`Forge ${forge} not supported.`);
  }
}

export async function doesRepoExists(url: string) {
  if (appSettings.pretendAllReposExist) return true;

  const res = await fetch(url);

  return res.status === 200;
}

export function toApiProject(project: ProjectModel) {
  if (!project) {
    return null;
  }

  if (!project.isValid) {
    throw new Error('Project not valid.');
  }

  if (!(project.name && project.forge)) {
    // Means that the relevant `OwnerUpdateRequested` event has not been processed yet.
    return null;
  }

  if (project.verificationStatus === ProjectVerificationStatus.Claimed) {
    return project;
  }

  return toFakeUnclaimedProject(project);
}

function toForge(forge: string): Forge {
  switch (forge.toLocaleLowerCase()) {
    case 'github':
      return `GitHub`;
    case 'gitlab':
      return `GitLab`;
    default:
      return shouldNeverHappen(`Forge ${forge} not supported.`);
  }
}

export async function toFakeUnclaimedProjectFromUrl(url: string) {
  const pattern =
    /^(?:https?:\/\/)?(?:www\.)?(github|gitlab)\.com\/([^\/]+)\/([^\/]+)/; // eslint-disable-line no-useless-escape
  const match = url.match(pattern);

  if (!match) {
    throw new Error(`Unsupported repository url: ${url}.`);
  }

  const forge = toForge(match[1]);
  const ownerName = match[2];
  const repoName = match[3];

  const repoDriver = RepoDriver__factory.connect(
    appSettings.repoDriverAddress,
    provider,
  );

  const nameAsBytesLike = ethers.toUtf8Bytes(`${ownerName}/${repoName}`);

  return {
    id: (
      await repoDriver.calcAccountId(toContractForge(forge), nameAsBytesLike)
    ).toString() as ProjectId,
    name: `${ownerName}/${repoName}`,
    forge,
    url,
    verificationStatus: ProjectVerificationStatus.Unclaimed,
  };
}

function toUrl(forge: Forge, projectName: string): string {
  switch (forge) {
    case 'GitHub':
      return `https://github.com/${projectName}`;
    default:
      throw new Error(`Unsupported forge: ${forge}.`);
  }
}

export async function toFakeUnclaimedProject(
  project: ProjectModel,
): Promise<FakeUnclaimedProject> {
  const { name, forge } = project;

  assert(name && forge, 'Project name and forge must be defined.');

  const { ownerName, repoName } = splitProjectName(name);

  const repoDriver = RepoDriver__factory.connect(
    appSettings.repoDriverAddress,
    provider,
  );

  const nameAsBytesLike = ethers.toUtf8Bytes(`${ownerName}/${repoName}`);

  return {
    id: (
      await repoDriver.calcAccountId(toContractForge(forge), nameAsBytesLike)
    ).toString() as ProjectId,
    name: `${ownerName}/${repoName}`,
    forge,
    url: toUrl(forge, name),
    verificationStatus:
      project.verificationStatus ?? ProjectVerificationStatus.Unclaimed,
  };
}
