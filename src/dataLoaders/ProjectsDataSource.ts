import type { WhereOptions } from 'sequelize';
import { Op } from 'sequelize';
import DataLoader from 'dataloader';
import ProjectModel from '../project/ProjectModel';
import type { FakeUnclaimedProject, ProjectId } from '../common/types';
import { doesRepoExists, toApiProject } from '../project/projectUtils';
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

  public async getProjectById(
    id: ProjectId,
  ): Promise<ProjectModel | FakeUnclaimedProject | null> {
    return toApiProject(await this._batchProjectsByIds.load(id));
  }

  public async getProjectByUrl(
    url: string,
  ): Promise<ProjectModel | FakeUnclaimedProject | null> {
    const project = toApiProject(
      await ProjectModel.findOne({ where: { url } }),
    );

    return (await doesRepoExists(url)) ? project : null;
  }

  public async getProjectsByFilter(
    where: ProjectWhereInput,
  ): Promise<(ProjectModel | FakeUnclaimedProject)[]> {
    const projects =
      (await ProjectModel.findAll({
        where: (where as WhereOptions) || {},
      })) || [];

    return projects
      .filter((p) => p.isValid)
      .map(toApiProject)
      .filter(Boolean) as (ProjectModel | FakeUnclaimedProject)[];
  }

  public async getProjectsByIds(ids: ProjectId[]): Promise<ProjectModel[]> {
    return this._batchProjectsByIds.loadMany(ids) as Promise<ProjectModel[]>;
  }
}
