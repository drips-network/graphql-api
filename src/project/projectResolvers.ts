import { type WhereOptions } from 'sequelize';
import type { ProjectAccountId } from '../common/types';
import ProjectModel, { ProjectVerificationStatus } from './ProjectModel';
import { toApiForge } from './projectUtils';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import { ReceiverType, Driver } from '../generated/graphql';
import type {
  SplitsReceiver,
  Source,
  ProjectAccount,
  ProjectOwner,
  ProjectSplits,
  Project,
  AddressReceiver,
} from '../generated/graphql';
import type { ContextValue } from '../server';
import { AddressDriverSplitReceiverType } from '../models/AddressDriverSplitReceiverModel';
import groupBy from '../utils/linq';

const projectResolvers = {
  Query: {
    async project(
      _parent: any,
      args: { id: ProjectAccountId },
    ): Promise<ProjectModel | null> {
      const project = await ProjectModel.findByPk(args.id);

      if (!project?.isValid) {
        throw new Error('Project not valid.');
      }

      return project;
    },
    async projects(_parent: any, args: { where?: WhereOptions }) {
      const { where } = args;

      const projects = await ProjectModel.findAll({
        where: where || {},
      });

      return projects;
    },
  },
  Project: {
    __resolveType(parent: ProjectModel) {
      if (parent.verificationStatus === ProjectVerificationStatus.Claimed) {
        return 'ClaimedProject';
      }

      return 'UnclaimedProject';
    },
  },
  ClaimedProject: {
    color: (project: ProjectModel): string =>
      project.color || shouldNeverHappen(),
    description: (project: ProjectModel): string | null => project.description,
    emoji: (project: ProjectModel): string =>
      project.emoji || shouldNeverHappen(),
    owner: (project: ProjectModel): ProjectOwner => ({
      driver: Driver.ADDRESS,
      accountId: project.id || shouldNeverHappen(),
      address: (project.ownerAddress as string) || shouldNeverHappen(),
    }),
    account: (project: ProjectModel): ProjectAccount => ({
      driver: Driver.REPO,
      accountId: project.id,
    }),
    source: (project: ProjectModel): Source => ({
      url: project.url || shouldNeverHappen(),
      repoName: project.repoName || shouldNeverHappen(),
      ownerName: project.ownerName || shouldNeverHappen(),
      forge: project.forge ? toApiForge(project.forge) : shouldNeverHappen(),
    }),
    verificationStatus: (project: ProjectModel): ProjectVerificationStatus =>
      project.verificationStatus === ProjectVerificationStatus.Claimed
        ? project.verificationStatus
        : shouldNeverHappen(),
    splits: async (
      project: ProjectModel,
      _: any,
      context: ContextValue,
    ): Promise<ProjectSplits> => {
      const {
        loaders: {
          projectsByIdsLoader,
          repoDriverSplitReceiversByProjectIdsLoader,
          addressDriverSplitReceiversByProjectIdsLoader,
        },
      } = context;

      const addressDriverSplitReceivers =
        await addressDriverSplitReceiversByProjectIdsLoader.load(project.id);

      const maintainersAndAddressDependencies = groupBy(
        addressDriverSplitReceivers
          .filter(
            (r) =>
              r.type === AddressDriverSplitReceiverType.ProjectMaintainer ||
              AddressDriverSplitReceiverType.ProjectDependency,
          )
          .map((receiver) => ({
            driver: Driver.ADDRESS,
            weight: receiver.weight,
            type: ReceiverType.ADDRESS,
            receiverType: receiver.type,
            accountId: receiver.fundeeAccountId,
            address: receiver.fundeeAccountAddress,
          })),
        (receiver) => receiver.receiverType,
      );

      const maintainers =
        (maintainersAndAddressDependencies.get(
          AddressDriverSplitReceiverType.ProjectMaintainer,
        ) as AddressReceiver[]) || [];

      const dependenciesOfTypeAddress =
        (maintainersAndAddressDependencies.get(
          AddressDriverSplitReceiverType.ProjectDependency,
        ) as AddressReceiver[]) || [];

      const repoDriverSplitReceivers =
        await repoDriverSplitReceiversByProjectIdsLoader.load(project.id);

      const splitsProjectIds: ProjectAccountId[] = [];
      for (const receiver of repoDriverSplitReceivers) {
        splitsProjectIds.push(receiver.fundeeProjectId || shouldNeverHappen());
      }

      const splitsProjects =
        await projectsByIdsLoader.loadMany(splitsProjectIds);

      const dependenciesOfTypeProject = repoDriverSplitReceivers.map(
        (receiver) => ({
          driver: Driver.REPO,
          weight: receiver.weight,
          type: ReceiverType.PROJECT,
          receiverType: receiver.type,
          project:
            (splitsProjects
              .filter(
                (p): p is ProjectModel => p && (p as any).id !== undefined,
              )
              .find(
                (p) => p.id === receiver.fundeeProjectId,
              ) as unknown as Project) || shouldNeverHappen(),
        }),
      );

      return {
        maintainers,
        dependencies: [
          ...dependenciesOfTypeAddress,
          ...dependenciesOfTypeProject,
        ],
      };
    },
  },
  SplitsReceiver: {
    __resolveType(receiver: SplitsReceiver) {
      if (receiver.type === ReceiverType.PROJECT) {
        return 'ProjectReceiver';
      }

      if (receiver.type === ReceiverType.DRIP_LIST) {
        return 'DripListReceiver';
      }

      if (receiver.type === ReceiverType.ADDRESS) {
        return 'AddressReceiver';
      }

      return shouldNeverHappen();
    },
  },
  UnclaimedProject: {
    account(project: ProjectModel): ProjectAccount {
      return {
        driver: Driver.REPO,
        accountId: project.id,
      };
    },
    source(project: ProjectModel): Source {
      return {
        url: project.url || shouldNeverHappen(),
        repoName: project.repoName || shouldNeverHappen(),
        ownerName: project.ownerName || shouldNeverHappen(),
        forge: project.forge ? toApiForge(project.forge) : shouldNeverHappen(),
      };
    },
    verificationStatus(project: ProjectModel): ProjectVerificationStatus {
      return project.verificationStatus === ProjectVerificationStatus.Unclaimed
        ? project.verificationStatus
        : shouldNeverHappen();
    },
  },
};

export default projectResolvers;
