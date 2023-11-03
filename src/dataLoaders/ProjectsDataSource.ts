import type { WhereOptions } from 'sequelize';
import { Op } from 'sequelize';
import DataLoader from 'dataloader';
import ProjectModel from '../project/ProjectModel';
import type { ProjectId } from '../common/types';
import {
  toFakeUnclaimedProject,
  doesRepoExists,
} from '../project/projectUtils';
import type { ProjectWhereInput } from '../generated/graphql';

export default class ProjectsDataSource {
  private readonly _batchProjectsByIds = new DataLoader(
    async (projectIds: readonly ProjectId[]): Promise<ProjectModel[]> => {
      const projects = await ProjectModel.findAll({
        where: {
          id: {
            [Op.in]: projectIds,
          },
          isValid: true,
        },
      });

      const projectIdToProjectMap = projects.reduce<
        Record<ProjectId, ProjectModel>
      >((mapping, project) => {
        mapping[project.id] = project; // eslint-disable-line no-param-reassign

        return mapping;
      }, {});

      return projectIds.map((id) => projectIdToProjectMap[id]);
    },
  );

  public async getProjectById(id: ProjectId): Promise<ProjectModel> {
    return this._batchProjectsByIds.load(id);
  }

  public async getProjectByUrl(url: string): Promise<ProjectModel | null> {
    const project = await ProjectModel.findOne({ where: { url } });

    if (project) {
      if (!project.isValid) {
        throw new Error('Project not valid.');
      }

      return project;
    }

    return (await doesRepoExists(url))
      ? (toFakeUnclaimedProject(url) as unknown as ProjectModel)
      : null;
  }

  public async getProjectsByFilter(
    where: ProjectWhereInput,
  ): Promise<ProjectModel[]> {
    const projects =
      (await ProjectModel.findAll({
        where: (where as WhereOptions) || {},
      })) || [];

    return projects.filter((p) => p.isValid);
  }

  public async getProjectsByIds(ids: ProjectId[]): Promise<ProjectModel[]> {
    return this._batchProjectsByIds.loadMany(ids) as Promise<ProjectModel[]>;
  }
}
