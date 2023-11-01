import { type WhereOptions } from 'sequelize';
import type { DripListAccountId, ProjectAccountId } from '../common/types';
import ProjectModel, { ProjectVerificationStatus } from './ProjectModel';
import {
  splitProjectName,
  toFakeUnclaimedProject,
  verifyRepoExists,
} from './projectUtils';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import { Driver } from '../generated/graphql';
import type {
  SplitsReceiver,
  Source,
  RepoDriverAccount,
  AddressDriverAccount,
  Splits,
  Project,
  AddressReceiver,
  Forge,
  DripList,
} from '../generated/graphql';
import type { ContextValue } from '../server';
import { AddressDriverSplitReceiverType } from '../models/AddressDriverSplitReceiverModel';
import groupBy from '../utils/linq';
import type DripListModel from '../drip-list/DripListModel';

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
    async projectByUrl(
      _parent: any,
      args: { url: string },
    ): Promise<ProjectModel | null> {
      const project = await ProjectModel.findOne({ where: { url: args.url } });

      if (project) {
        if (!project?.isValid) {
          throw new Error('Project not valid.');
        }

        return project;
      }

      const repoExist = await verifyRepoExists(args.url);

      if (!repoExist) {
        return null;
      }

      return toFakeUnclaimedProject(args.url) as unknown as ProjectModel;
    },
    async projects(_parent: any, args: { where?: WhereOptions }) {
      const { where } = args;

      const projects =
        (await ProjectModel.findAll({
          where: where || {},
        })) || [];

      return projects.filter(
        (p) =>
          p.verificationStatus === ProjectVerificationStatus.Claimed &&
          p.isValid,
      );
    },
  },
  Project: {
    __resolveType(parent: ProjectModel) {
      if (parent.verificationStatus === ProjectVerificationStatus.Claimed) {
        return 'ClaimedProject';
      }
      if (parent.verificationStatus === ProjectVerificationStatus.Unclaimed) {
        return 'UnclaimedProject';
      }

      return shouldNeverHappen(`Invalid verification status: ${parent.id}.`);
    },
  },
  ClaimedProject: {
    color: (project: ProjectModel): string =>
      project.color || shouldNeverHappen(),
    description: (project: ProjectModel): string | null => project.description,
    emoji: (project: ProjectModel): string =>
      project.emoji || shouldNeverHappen(),
    owner: (project: ProjectModel): AddressDriverAccount => ({
      driver: Driver.ADDRESS,
      accountId: project.ownerAccountId || shouldNeverHappen(),
      address: (project.ownerAddress as string) || shouldNeverHappen(),
    }),
    account: (project: ProjectModel): RepoDriverAccount => ({
      driver: Driver.REPO,
      accountId: project.id,
    }),
    source: (project: ProjectModel): Source => ({
      url: project.url || shouldNeverHappen(),
      repoName: splitProjectName(project.name || shouldNeverHappen()).repoName,
      ownerName: splitProjectName(project.name || shouldNeverHappen())
        .ownerName,
      forge: (project.forge as Forge) || shouldNeverHappen(),
    }),
    verificationStatus: (project: ProjectModel): ProjectVerificationStatus =>
      project.verificationStatus === ProjectVerificationStatus.Claimed
        ? project.verificationStatus
        : shouldNeverHappen(),
    splits: async (
      project: ProjectModel,
      _: any,
      context: ContextValue,
    ): Promise<Splits> => {
      const {
        loaders: {
          projectsByIdsLoader,
          dripListsByIdsLoader,
          repoDriverSplitReceiversByProjectIdsLoader,
          addressDriverSplitReceiversByProjectIdsLoader,
          nftDriverSplitReceiversByProjectDataLoader,
        },
      } = context;

      const addressDriverSplitReceivers =
        await addressDriverSplitReceiversByProjectIdsLoader.load(project.id);

      const maintainersAndAddressDependencies = groupBy(
        addressDriverSplitReceivers.map((receiver) => ({
          driver: Driver.ADDRESS,
          weight: receiver.weight,
          receiverType: receiver.type,
          account: {
            driver: Driver.ADDRESS,
            accountId: receiver.fundeeAccountId,
            address: receiver.fundeeAccountAddress,
          },
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
          receiverType: receiver.type,
          account: {
            driver: Driver.REPO,
            accountId: receiver.fundeeProjectId,
          },
          project:
            (splitsProjects
              .filter(
                (p): p is ProjectModel => p && (p as any).id !== undefined,
              )
              .find(
                (p) => (p as any).id === receiver.fundeeProjectId,
              ) as unknown as Project) || shouldNeverHappen(),
        }),
      );

      const dripListSplitReceivers =
        await nftDriverSplitReceiversByProjectDataLoader.load(project.id);

      const dripListProjectIds: DripListAccountId[] = [];
      for (const receiver of dripListSplitReceivers) {
        dripListProjectIds.push(
          receiver.fundeeDripListId || shouldNeverHappen(),
        );
      }

      const dripListSplits =
        await dripListsByIdsLoader.loadMany(dripListProjectIds);

      const dripListReceivers = dripListSplitReceivers.map((receiver) => ({
        driver: Driver.NFT,
        weight: receiver.weight,
        account: {
          driver: Driver.NFT,
          accountId: receiver.fundeeDripListId,
        },
        dripList:
          (dripListSplits
            .filter((l): l is DripListModel => l && (l as any).id !== undefined)
            .find(
              (p) => (p as any).id === receiver.fundeeDripListId,
            ) as unknown as DripList) || shouldNeverHappen(),
      }));

      return {
        maintainers,
        dependencies: [
          ...dependenciesOfTypeAddress,
          ...dependenciesOfTypeProject,
          ...dripListReceivers,
        ],
      };
    },
  },
  SplitsReceiver: {
    __resolveType(receiver: SplitsReceiver) {
      if (receiver.driver === Driver.REPO) {
        return 'ProjectReceiver';
      }

      if (receiver.driver === Driver.NFT) {
        return 'DripListReceiver';
      }

      if (receiver.driver === Driver.ADDRESS) {
        return 'AddressReceiver';
      }

      return shouldNeverHappen();
    },
  },
  UnclaimedProject: {
    account(project: ProjectModel): RepoDriverAccount {
      return {
        driver: Driver.REPO,
        accountId: project.id,
      };
    },
    source(project: ProjectModel): Source {
      return {
        url: project.url || shouldNeverHappen(),
        repoName: splitProjectName(project.name || shouldNeverHappen())
          .repoName,
        ownerName: splitProjectName(project.name || shouldNeverHappen())
          .ownerName,
        forge: (project.forge as Forge) || shouldNeverHappen(),
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
