import { Op, type WhereOptions } from 'sequelize';
import type { ProjectAccountId } from '../common/types';
import ProjectModel, { ProjectVerificationStatus } from './ProjectModel';
import toApiForge from './project-utils';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import AddressDriverSplitReceiverModel, {
  AddressDriverSplitReceiverType,
} from '../models/AddressDriverSplitReceiverModel';
import type { SplitsReceiver } from '../generated/graphql';
import { AccountType, ReceiverType } from '../generated/graphql';
import RepoDriverSplitReceiverModel, {
  RepoDriverSplitReceiverType,
} from '../models/RepoDriverSplitReceiverModel';

const projectResolvers = {
  Query: {
    async project(
      _: any,
      args: { id: ProjectAccountId },
    ): Promise<ProjectModel | null> {
      const project = await ProjectModel.findByPk(args.id);

      if (!project) {
        return null;
      }

      if (!project.isValid) {
        throw new Error('Project not valid.');
      }

      return project;
    },
    async projects(_: any, args: { where?: WhereOptions }) {
      const { where } = args;

      const projects = await ProjectModel.findAll({
        where: where || {},
      });

      return projects;
    },
  },
  Project: {
    __resolveType(project: ProjectModel) {
      if (project.verificationStatus === ProjectVerificationStatus.Claimed) {
        return 'ClaimedProject';
      }

      return 'UnclaimedProject';
    },
  },
  SplitsReceiver: {
    __resolveType(receiver: SplitsReceiver) {
      if (receiver.type === ReceiverType.Address) {
        return 'AddressReceiver';
      }
      if (receiver.type === ReceiverType.Project) {
        return 'ProjectReceiver';
      }
      if (receiver.type === ReceiverType.DripList) {
        return 'DripListReceiver';
      }

      return null;
    },
  },
  ClaimedProject: {
    color(parent: ProjectModel) {
      return parent.color || shouldNeverHappen();
    },
    description(parent: ProjectModel) {
      return parent.description;
    },
    emoji(parent: ProjectModel) {
      return parent.emoji || shouldNeverHappen();
    },
    ownerAccount(parent: ProjectModel) {
      return {
        accountId: parent.id || shouldNeverHappen(),
        driver: AccountType.AddressDriver,
        address: (parent.ownerAddress as string) || shouldNeverHappen(),
      };
    },
    projectAccount(parent: ProjectModel) {
      return { accountId: parent.id, driver: AccountType.RepoDriver };
    },
    source(parent: ProjectModel) {
      return {
        forge: parent.forge ? toApiForge(parent.forge) : shouldNeverHappen(),
        url: parent.url || shouldNeverHappen(),
        repoName: parent.repoName || shouldNeverHappen(),
        ownerName: parent.ownerName || shouldNeverHappen(),
      };
    },
    async splits(parent: ProjectModel) {
      const addressReceivers = await AddressDriverSplitReceiverModel.findAll({
        where: {
          funderProjectId: parent.id,
          type: {
            [Op.or]: [
              AddressDriverSplitReceiverType.ProjectMaintainer,
              AddressDriverSplitReceiverType.ProjectDependency,
            ],
          },
        },
      });

      const apiAddressReceivers = addressReceivers.map((receiver) => ({
        type: ReceiverType.Address,
        receiverType: receiver.type,
        weight: receiver.weight,
        account: {
          driver: AccountType.AddressDriver,
          accountId: receiver.fundeeAccountId,
          address: receiver.fundeeAccountAddress,
        },
      }));

      const projectReceivers = await RepoDriverSplitReceiverModel.findAll({
        where: {
          funderProjectId: parent.id,
          type: RepoDriverSplitReceiverType.ProjectDependency,
        },
      });

      const apiProjectReceivers = projectReceivers.map(async (receiver) => ({
        type: ReceiverType.Project,
        receiverType: receiver.type,
        weight: receiver.weight,
        account: {
          driver: AccountType.RepoDriver,
          accountId: receiver.funderProjectId || shouldNeverHappen(),
        },
        source: (async () => {
          const fundeeProject = await ProjectModel.findByPk(
            receiver.fundeeProjectId || shouldNeverHappen(),
          );

          return {
            forge: fundeeProject?.forge
              ? toApiForge(fundeeProject.forge)
              : shouldNeverHappen(),
            url: fundeeProject?.url || shouldNeverHappen(),
            repoName: fundeeProject?.repoName || shouldNeverHappen(),
            ownerName: fundeeProject?.ownerName || shouldNeverHappen(),
          };
        })(),
      }));

      return {
        maintainers: apiAddressReceivers.filter(
          (receiver) =>
            receiver.receiverType ===
            AddressDriverSplitReceiverType.ProjectMaintainer,
        ),
        dependencies: [
          ...apiAddressReceivers
            .filter(
              (receiver) =>
                receiver.receiverType ===
                AddressDriverSplitReceiverType.ProjectDependency,
            )
            .concat(apiProjectReceivers as any),
        ],
      };
    },
    verificationStatus(parent: ProjectModel) {
      return parent.verificationStatus === ProjectVerificationStatus.Claimed
        ? parent.verificationStatus
        : shouldNeverHappen();
    },
  },
  UnclaimedProject: {
    projectAccount(parent: ProjectModel) {
      return {
        accountId: parent.id || shouldNeverHappen(),
        driver: AccountType.RepoDriver,
      };
    },
    source(parent: ProjectModel) {
      return {
        forge: parent.forge ? toApiForge(parent.forge) : shouldNeverHappen(),
        url: parent.url || shouldNeverHappen(),
        repoName: parent.repoName || shouldNeverHappen(),
        ownerName: parent.ownerName || shouldNeverHappen(),
      };
    },
    verificationStatus(parent: ProjectModel) {
      return parent.verificationStatus === ProjectVerificationStatus.Unclaimed
        ? parent.verificationStatus
        : shouldNeverHappen();
    },
  },
};

export default projectResolvers;
