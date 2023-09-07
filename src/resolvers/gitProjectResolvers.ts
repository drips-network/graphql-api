import {
  AddressDriverSplitReceiverModel,
  GitProjectModel,
  RepoDriverSplitReceiverModel,
} from '../models';

const gitProjectResolvers = {
  Query: {
    async gitProject(_: any, args: { id: string }) {
      return GitProjectModel.findByPk(args.id, {
        include: {
          model: AddressDriverSplitReceiverModel,
          as: 'addressDriverSplitReceivers',
        },
      });
    },
    async gitProjects() {
      return GitProjectModel.findAll({
        include: {
          model: AddressDriverSplitReceiverModel,
          as: 'addressDriverSplitReceivers',
        },
      });
    },
  },
  GitProject: {
    async splits(parent: { id: any }) {
      const addressDependencies = await AddressDriverSplitReceiverModel.findAll(
        {
          where: {
            funderProjectId: parent.id,
            type: 'Dependency',
          },
        },
      );

      const projectDependencies = (
        await RepoDriverSplitReceiverModel.findAll({
          where: {
            funderProjectId: parent.id,
          },
        })
      ).map(async (split) =>
        Object.assign(split, {
          project: await GitProjectModel.findByPk(split.selfProjectId),
        }),
      );

      return {
        maintainers: AddressDriverSplitReceiverModel.findAll({
          where: {
            funderProjectId: parent.id,
            type: 'Maintainer',
          },
        }),
        dependencies: [...addressDependencies, ...projectDependencies],
      };
    },
  },
  DependencySplitReceiver: {
    __resolveType(obj: any) {
      if (obj instanceof AddressDriverSplitReceiverModel) {
        return 'AddressDriverSplitReceiver';
      }
      if (obj instanceof RepoDriverSplitReceiverModel) {
        return 'RepoDriverSplitReceiver';
      }
      return null;
    },
  },
};

export default gitProjectResolvers;
