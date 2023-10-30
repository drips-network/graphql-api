import { Op } from 'sequelize';
import { WebSocketProvider, ethers } from 'ethers';
import type { Forge, ProjectAccountId } from '../common/types';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import ProjectModel, { ProjectVerificationStatus } from './ProjectModel';
import { RepoDriver__factory } from '../generated/contracts';

export async function getProjects(
  ids: ProjectAccountId[],
): Promise<ProjectModel[]> {
  return ProjectModel.findAll({
    where: {
      id: {
        [Op.in]: ids,
      },
    },
  });
}

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

export async function verifyRepoExists(url: string) {
  const res = await fetch(url);

  return res.status === 200;
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

export async function toFakeUnclaimedProject(url: string) {
  const pattern =
    /^(?:https?:\/\/)?(?:www\.)?(github|gitlab)\.com\/([^\/]+)\/([^\/]+)/; // eslint-disable-line no-useless-escape
  const match = url.match(pattern);

  if (!match) return null;

  const forge = toForge(match[1]);
  const ownerName = match[2];
  const repoName = match[3];

  const provider = new WebSocketProvider(
    `wss://mainnet.infura.io/ws/v3/${process.env.INFURA_API_KEY}`,
  );

  const repoDriverAddress = '0x770023d55D09A9C110694827F1a6B32D5c2b373E';

  const repoDriver = RepoDriver__factory.connect(repoDriverAddress, provider);

  const nameAsBytesLike = ethers.toUtf8Bytes(`${ownerName}/${repoName}`);
  return {
    id: (
      await repoDriver.calcAccountId(toContractForge(forge), nameAsBytesLike)
    ).toString(),
    forge,
    ownerName,
    repoName,
    url,
    verificationStatus: ProjectVerificationStatus.Unclaimed,
  };
}
