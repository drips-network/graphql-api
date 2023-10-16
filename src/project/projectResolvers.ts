import { Op, type WhereOptions } from 'sequelize';
import type { ProjectAccountId } from '../common/types';
import ProjectModel, { ProjectVerificationStatus } from './ProjectModel';
import toApiForge from './project-utils';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import AddressDriverSplitReceiverModel, {
  AddressDriverSplitReceiverType,
} from '../models/AddressDriverSplitReceiverModel';
import type {
  AddressReceiver,
  ProjectReceiver,
  ProjectSplits,
  SplitsReceiver,
} from '../generated/graphql';
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
    async splits(parent: ProjectModel): Promise<ProjectSplits> {
      const addressReceiverEntities =
        await AddressDriverSplitReceiverModel.findAll({
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

      const addressReceiversDtos = addressReceiverEntities.map((receiver) => ({
        type: ReceiverType.Address,
        receiverType: receiver.type,
        weight: receiver.weight,
        account: {
          driver: AccountType.AddressDriver,
          accountId: receiver.fundeeAccountId,
          address: receiver.fundeeAccountAddress,
        },
      }));

      const addressReceiversMaintainersDtos: AddressReceiver[] =
        addressReceiversDtos.filter(
          (receiver) =>
            receiver.receiverType ===
            AddressDriverSplitReceiverType.ProjectMaintainer,
        ) as AddressReceiver[];

      const addressReceiversDependenciesDtos: AddressReceiver[] =
        addressReceiversDtos.filter(
          (receiver) =>
            receiver.receiverType ===
            AddressDriverSplitReceiverType.ProjectDependency,
        ) as AddressReceiver[];

      const projectReceiverEntities =
        await RepoDriverSplitReceiverModel.findAll({
          where: {
            funderProjectId: parent.id,
            type: RepoDriverSplitReceiverType.ProjectDependency,
          },
        });

      const projectReceiversDtos: ProjectReceiver[] = await Promise.all(
        projectReceiverEntities.map(async (receiver) => {
          const fundeeProject = await ProjectModel.findByPk(
            receiver.fundeeProjectId || shouldNeverHappen(),
          );

          return {
            type: ReceiverType.Project,
            receiverType: receiver.type,
            weight: receiver.weight,
            account: {
              driver: AccountType.RepoDriver,
              accountId: receiver.funderProjectId || shouldNeverHappen(),
            },
            source: {
              forge: fundeeProject?.forge
                ? toApiForge(fundeeProject.forge)
                : shouldNeverHappen(),
              url: fundeeProject?.url || shouldNeverHappen(),
              repoName: fundeeProject?.repoName || shouldNeverHappen(),
              ownerName: fundeeProject?.ownerName || shouldNeverHappen(),
            },
          };
        }),
      );

      return {
        maintainers: addressReceiversMaintainersDtos,
        dependencies: [
          ...addressReceiversDependenciesDtos,
          ...projectReceiversDtos,
        ] as SplitsReceiver[],
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
