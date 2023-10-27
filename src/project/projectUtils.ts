import { Op } from 'sequelize';
import type { Forge as DbForge, ProjectAccountId } from '../common/types';
import { Forge as ApiForge } from '../generated/graphql';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import ProjectModel from './ProjectModel';

export function toApiForge(forge: DbForge): ApiForge {
  switch (forge) {
    case 'GitHub':
      return ApiForge.GITHUB;
    case 'GitLab':
      return ApiForge.GITLAB;
    default:
      return shouldNeverHappen(forge);
  }
}

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
