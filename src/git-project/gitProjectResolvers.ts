import type { WhereOptions } from 'sequelize';
import type { ProjectId } from '../common/types';
import AddressDriverSplitReceiverModel, {
  AddressDriverSplitReceiverType,
} from '../models/AddressDriverSplitReceiverModel';
import RepoDriverSplitReceiverModel, {
  RepoDriverSplitReceiverType,
} from '../models/RepoDriverSplitReceiverModel';
import GitProjectModel from './GitProjectModel';

const gitProjectResolvers = {
  Query: {
    async gitProjectById(_: any, args: { id: ProjectId }) {
      const project = await GitProjectModel.findByPk(args.id, {
        include: [
          {
            model: AddressDriverSplitReceiverModel,
            as: 'projectAddressSplits',
          },
          {
            model: RepoDriverSplitReceiverModel,
            as: 'projectRepoSplits',
            include: [
              {
                model: GitProjectModel,
                as: 'projectFundeeProject',
              },
            ],
          },
        ],
      });

      if (!project) {
        return null;
      }

      if (!project.isValid) {
        throw new Error('Git Project is not valid');
      }

      return toDto(project);
    },
    async gitProjects(_: any, args: { where?: WhereOptions }) {
      const { where } = args;

      const projects = await GitProjectModel.findAll({
        where: where || {},
        include: [
          {
            model: AddressDriverSplitReceiverModel,
            as: 'projectAddressSplits',
          },
          {
            model: RepoDriverSplitReceiverModel,
            as: 'projectRepoSplits',
            include: [
              {
                model: GitProjectModel,
                as: 'projectFundeeProject',
              },
            ],
          },
        ],
      });

      return projects.map(toDto);
    },
  },
};

export default gitProjectResolvers;

enum Driver {
  AddressDriver = 'AddressDriver',
  RepoDriver = 'RepoDriver',
}

function toDto(project: GitProjectModel) {
  const maintainers = project.projectAddressSplits
    ?.filter((a) => a.type === AddressDriverSplitReceiverType.ProjectMaintainer)
    .map((a) => ({
      ...a.dataValues,
      driver: Driver.AddressDriver,
    }));

  const dependenciesOfTypeAddress = project.projectAddressSplits
    ?.filter((a) => a.type === AddressDriverSplitReceiverType.ProjectDependency)
    .map((a) => ({
      ...a.dataValues,
      driver: Driver.AddressDriver,
    }));

  const dependenciesOfTypeProject = project.projectRepoSplits
    ?.filter((a) => a.type === RepoDriverSplitReceiverType.ProjectDependency)
    .map((p) => ({
      ...p.dataValues,
      fundeeProject: p.projectFundeeProject?.dataValues
        ? {
            ...p.projectFundeeProject?.dataValues,
          }
        : null,
      driver: Driver.RepoDriver,
    }));

  return {
    ...project?.dataValues,
    splits: {
      maintainers,
      dependencies: {
        ofTypeAddress: dependenciesOfTypeAddress,
        ofTypeProject: dependenciesOfTypeProject,
      },
    },
  };
}
