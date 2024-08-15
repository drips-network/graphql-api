import { isAddress } from 'ethers';
import type {
  AccountId,
  FakeUnclaimedProject,
  ProjectId,
} from '../common/types';
import type ProjectModel from './ProjectModel';
import { ProjectVerificationStatus } from './ProjectModel';
import { splitProjectName } from './projectUtils';
import unreachableError from '../utils/unreachableError';
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
  ProjectSortInput,
} from '../generated/graphql';
import type { Context } from '../server';
import { AddressDriverSplitReceiverType } from '../models/AddressDriverSplitReceiverModel';
import groupBy from '../utils/linq';
import type DripListModel from '../drip-list/DripListModel';
import assert, {
  isGitHubUrl,
  isProjectVerificationStatus,
  isProjectId,
  isSortableProjectField,
} from '../utils/assert';
import SplitEventModel from '../models/SplitEventModel';
import GivenEventModel from '../given-event/GivenEventModel';
import mergeAmounts from '../utils/mergeAmounts';
import getWithdrawableBalances from '../utils/getWithdrawableBalances';
import { getLatestMetadataHash } from '../utils/getLatestAccountMetadata';

const projectResolvers = {
  Query: {
    projectById: async (
      _: any,
      { id }: { id: ProjectId },
      { dataSources }: Context,
    ): Promise<ProjectModel | FakeUnclaimedProject | null> => {
      assert(isProjectId(id));

      return dataSources.projectsDb.getProjectById(id);
    },
    projectByUrl: async (
      _: any,
      { url }: { url: string },
      { dataSources }: Context,
    ): Promise<ProjectModel | FakeUnclaimedProject | null> => {
      assert(isGitHubUrl(url));

      return dataSources.projectsDb.getProjectByUrl(url);
    },
    projects: async (
      _: any,
      { where, sort }: { where: ProjectWhereInput; sort: ProjectSortInput },
      { dataSources }: Context,
    ): Promise<(ProjectModel | FakeUnclaimedProject)[]> => {
      if (where?.id) {
        assert(isProjectId(where.id));
      }

      if (where?.ownerAddress) {
        assert(isAddress(where.ownerAddress));
      }

      if (where?.url) {
        assert(isGitHubUrl(where.url));
      }

      if (where?.verificationStatus) {
        assert(isProjectVerificationStatus(where.verificationStatus));
      }

      if (sort?.field === 'claimedAt') {
        assert(isSortableProjectField(sort.field));
      }

      return dataSources.projectsDb.getProjectsByFilter(where, sort);
    },
    earnedFunds: async (
      _: any,
      { projectId }: { projectId: ProjectId },
      { dataSources }: Context,
    ) => {
      assert(isProjectId(projectId));

      return dataSources.projectsDb.getEarnedFunds(projectId);
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
      project.color || unreachableError(),
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
      accountId: project.ownerAccountId || unreachableError(),
      address: (project.ownerAddress as string) || unreachableError(),
    }),
    account: (project: ProjectModel): RepoDriverAccount => ({
      driver: Driver.REPO,
      accountId: project.id,
    }),
    source: (project: ProjectModel): Source => ({
      url: project.url || unreachableError(),
      repoName: splitProjectName(project.name || unreachableError()).repoName,
      ownerName: splitProjectName(project.name || unreachableError()).ownerName,
      forge: (project.forge as Forge) || unreachableError(),
    }),
    verificationStatus: (project: ProjectModel): ProjectVerificationStatus =>
      project.verificationStatus === ProjectVerificationStatus.Claimed
        ? project.verificationStatus
        : unreachableError(),
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
              ) as unknown as Project) || unreachableError(),
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
              ) as unknown as DripList) || unreachableError(),
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
    totalEarned: async (project: ProjectModel) => {
      const [splitEvents, givenEvents] = await Promise.all([
        SplitEventModel.findAll({
          where: {
            receiver: project.id,
          },
        }),
        GivenEventModel.findAll({
          where: {
            receiver: project.id,
          },
        }),
      ]);

      return mergeAmounts(
        [...splitEvents, ...givenEvents].map((event) => ({
          tokenAddress: event.erc20,
          amount: BigInt(event.amt),
        })),
      ).map((amount) => ({
        ...amount,
        amount: amount.amount.toString(),
      }));
    },
    withdrawableBalances: async (parent: ProjectModel) =>
      getWithdrawableBalances(parent.id as AccountId),
    latestMetadataIpfsHash: async (parent: ProjectModel) => {
      const { id } = parent;
      return getLatestMetadataHash(id as AccountId);
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

      return unreachableError();
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
        url: project.url || unreachableError(),
        repoName: splitProjectName(project.name || unreachableError()).repoName,
        ownerName: splitProjectName(project.name || unreachableError())
          .ownerName,
        forge: (project.forge as Forge) || unreachableError(),
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
    withdrawableBalances: async (parent: ProjectModel) =>
      getWithdrawableBalances(parent.id as AccountId),
  },
};

export default projectResolvers;
