import type { FakeUnclaimedProject, ProjectId } from '../common/types';
import type ProjectModel from './ProjectModel';
import { ProjectVerificationStatus } from './ProjectModel';
import { splitProjectName } from './projectUtils';
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
  ProjectWhereInput,
} from '../generated/graphql';
import type { Context } from '../server';
import { AddressDriverSplitReceiverType } from '../models/AddressDriverSplitReceiverModel';
import groupBy from '../utils/linq';
import type DripListModel from '../drip-list/DripListModel';

const projectResolvers = {
  Query: {
    projectById: async (
      _: any,
      { id }: { id: ProjectId },
      { dataSources }: Context,
    ): Promise<ProjectModel | FakeUnclaimedProject | null> =>
      dataSources.projectsDb.getProjectById(id),
    projectByUrl: async (
      _: any,
      { url }: { url: string },
      { dataSources }: Context,
    ): Promise<ProjectModel | FakeUnclaimedProject | null> =>
      dataSources.projectsDb.getProjectByUrl(url),
    projects: async (
      _: any,
      { where }: { where: ProjectWhereInput },
      { dataSources }: Context,
    ): Promise<(ProjectModel | FakeUnclaimedProject)[]> =>
      dataSources.projectsDb.getProjectsByFilter(where),
  },
  Project: {
    __resolveType(parent: ProjectModel) {
      if (parent.verificationStatus === ProjectVerificationStatus.Claimed) {
        return 'ClaimedProject';
      }

      return 'UnclaimedProject';
    },
  },
  Avatar: {
    __resolveType(parent: { cid: string } | { emoji: string }) {
      if ('cid' in parent) {
        return 'ImageAvatar';
      }

      return 'EmojiAvatar';
    },
  },
  ClaimedProject: {
    color: (project: ProjectModel): string =>
      project.color || shouldNeverHappen(),
    description: (project: ProjectModel): string | null => project.description,
    emoji: (project: ProjectModel): string => project.emoji || '💧',
    avatar: (project: ProjectModel): any => {
      if (project.avatarCid) {
        return {
          cid: project.avatarCid,
        };
      }

      return {
        emoji: project.emoji || '💧',
      };
    },
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
      context: Context,
    ): Promise<Splits> => {
      const {
        dataSources: {
          projectsDb,
          dripListsDb,
          receiversOfTypeAddressDb,
          receiversOfTypeProjectDb,
          receiversOfTypeDripListDb,
        },
      } = context;

      const receiversOfTypeAddressModels =
        await receiversOfTypeAddressDb.getReceiversOfTypeAddressByProjectId(
          project.id,
        );

      const maintainersAndAddressDependencies = groupBy(
        receiversOfTypeAddressModels.map((receiver) => ({
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

      const receiversOfTypeProjectModels =
        await receiversOfTypeProjectDb.getReceiversOfTypeProjectByProjectId(
          project.id,
        );

      const splitsOfTypeProjectModels = await projectsDb.getProjectsByIds(
        receiversOfTypeProjectModels.map((r) => r.fundeeProjectId),
      );

      const dependenciesOfTypeProject = receiversOfTypeProjectModels.map(
        (receiver) => ({
          driver: Driver.REPO,
          weight: receiver.weight,
          receiverType: receiver.type,
          account: {
            driver: Driver.REPO,
            accountId: receiver.fundeeProjectId,
          },
          project:
            (splitsOfTypeProjectModels
              .filter(
                (p): p is ProjectModel => p && (p as any).id !== undefined,
              )
              .find(
                (p) => (p as any).id === receiver.fundeeProjectId,
              ) as unknown as Project) || shouldNeverHappen(),
        }),
      );

      const receiversOfTypeDripListModels =
        await receiversOfTypeDripListDb.getReceiversOfTypeDripListByProjectId(
          project.id,
        );

      const splitsOfTypeDripListModels = await dripListsDb.getDripListsByIds(
        receiversOfTypeDripListModels.map((r) => r.fundeeDripListId),
      );

      const dripListReceivers = receiversOfTypeDripListModels.map(
        (receiver) => ({
          driver: Driver.NFT,
          weight: receiver.weight,
          account: {
            driver: Driver.NFT,
            accountId: receiver.fundeeDripListId,
          },
          dripList:
            (splitsOfTypeDripListModels
              .filter(
                (l): l is DripListModel => l && (l as any).id !== undefined,
              )
              .find(
                (p) => (p as any).id === receiver.fundeeDripListId,
              ) as unknown as DripList) || shouldNeverHappen(),
        }),
      );

      return {
        maintainers,
        dependencies: [
          ...dependenciesOfTypeAddress,
          ...dependenciesOfTypeProject,
          ...dripListReceivers,
        ],
      };
    },
    support: async (project: ProjectModel, _: any, context: Context) => {
      const {
        dataSources: { projectAndDripListSupportDb },
      } = context;

      const projectAndDripListSupport =
        await projectAndDripListSupportDb.getProjectAndDripListSupportByProjectId(
          project.id,
        );

      const oneTimeDonationSupport =
        await projectAndDripListSupportDb.getOneTimeDonationSupportByAccountId(
          project.id,
        );

      return [...projectAndDripListSupport, ...oneTimeDonationSupport];
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
      return project.verificationStatus;
    },
    support: async (project: ProjectModel, _: any, context: Context) => {
      const {
        dataSources: { projectAndDripListSupportDb },
      } = context;

      const projectAndDripListSupport =
        await projectAndDripListSupportDb.getProjectAndDripListSupportByProjectId(
          project.id,
        );

      const oneTimeDonationSupport =
        await projectAndDripListSupportDb.getOneTimeDonationSupportByAccountId(
          project.id,
        );

      return [...projectAndDripListSupport, ...oneTimeDonationSupport];
    },
  },
};

export default projectResolvers;
