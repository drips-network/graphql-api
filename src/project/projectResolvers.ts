import { isAddress } from 'ethers';
import type {
  ProjectDataValues,
  ProjectId,
  ResolverClaimedChainProjectData,
  ResolverClaimedProjectData,
  ResolverProject,
  ResolverUnClaimedChainProjectData,
  ResolverUnClaimedProjectData,
} from '../common/types';
import { toResolverProjects } from './projectUtils';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import { Driver, SupportedChain } from '../generated/graphql';
import type {
  SplitsReceiver,
  Source,
  RepoDriverAccount,
  AddressDriverAccount,
  Splits,
  Project,
  AddressReceiver,
  DripList,
  ProjectWhereInput,
  ProjectSortInput,
  ProjectChainData,
  Avatar,
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
import queryableChains from '../common/queryableChains';

const projectResolvers = {
  Query: {
    projectById: async (
      _: any,
      { id }: { id: ProjectId },
      { dataSources }: Context,
    ): Promise<ProjectDataValues | null> => {
      assert(isProjectId(id));

      return dataSources.projectsDb.getProjectById(id);
    },
    projectByUrl: async (
      _: any,
      { url }: { url: string },
      { dataSources }: Context,
    ): Promise<ProjectDataValues | null> => {
      assert(isGitHubUrl(url));

      return dataSources.projectsDb.getProjectByUrl(url);
    },
    projects: async (
      _: any,
      {
        chains,
        where,
        sort,
      }: {
        chains: SupportedChain[];
        where: ProjectWhereInput;
        sort: ProjectSortInput;
      },
      { dataSources }: Context,
    ): Promise<ResolverProject[]> => {
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

      if (chains) {
        chains.forEach((chain) => {
          assert(chain in SupportedChain);
        });
      }

      const chainsToQuery = chains?.length ? chains : queryableChains;

      const projectsDataValues =
        await dataSources.projectsDb.getProjectsByFilter(
          chainsToQuery,
          where,
          sort,
        );

      return toResolverProjects(chainsToQuery, projectsDataValues);
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
    account: (project: ResolverProject): RepoDriverAccount => project.account,
    source: (project: ResolverProject): Source => project.source,
  },
  ProjectChainData: {
    __resolveType(parent: ProjectChainData) {
      if ('claimedAt' in parent.data) {
        return 'ClaimedChainProjectData';
      }

      return 'UnClaimedChainProjectData';
    },
  },
  ClaimedChainProjectData: {
    chain: (
      chainProjectData: ResolverClaimedChainProjectData,
    ): SupportedChain => chainProjectData.chain,
    data: (chainProjectData: ResolverClaimedChainProjectData) =>
      chainProjectData.data,
  },
  UnClaimedChainProjectData: {
    chain: (
      chainProjectData: ResolverUnClaimedChainProjectData,
    ): SupportedChain => chainProjectData.chain,
    data: (chainProjectData: ResolverUnClaimedChainProjectData) =>
      chainProjectData.data,
  },
  ClaimedProjectData: {
    verificationStatus: (projectData: ResolverClaimedProjectData) =>
      projectData.verificationStatus,
    color: (projectData: ResolverClaimedProjectData): string =>
      projectData.color,
    description: (projectData: ResolverClaimedProjectData) =>
      projectData.description,
    emoji: (projectData: ResolverClaimedProjectData): string =>
      projectData.emoji || '💧',
    avatar: (projectData: ResolverClaimedProjectData): Avatar =>
      projectData.avatar,
    owner: (projectData: ResolverClaimedProjectData): AddressDriverAccount =>
      projectData.owner,
    splits: async (
      project: ResolverClaimedProjectData,
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
          project.projectId,
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
          project.projectId,
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
                (p): p is ProjectDataValues => p && (p as any).id !== undefined,
              )
              .find(
                (p) => (p as any).id === receiver.fundeeProjectId,
              ) as unknown as Project) || shouldNeverHappen(),
        }),
      );

      const receiversOfTypeDripListModels =
        await receiversOfTypeDripListDb.getReceiversOfTypeDripListByProjectId(
          project.projectId,
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
    support: async (
      project: ResolverClaimedProjectData,
      _: any,
      context: Context,
    ) => {
      const {
        dataSources: { projectAndDripListSupportDb },
      } = context;

      const projectAndDripListSupport =
        await projectAndDripListSupportDb.getProjectAndDripListSupportByProjectId(
          project.projectId,
        );

      const oneTimeDonationSupport =
        await projectAndDripListSupportDb.getOneTimeDonationSupportByAccountId(
          project.projectId,
        );

      return [...projectAndDripListSupport, ...oneTimeDonationSupport];
    },
  },
  UnClaimedProjectData: {
    verificationStatus: (projectData: ResolverUnClaimedProjectData) =>
      projectData.verificationStatus,
    support: async (
      projectData: ResolverUnClaimedProjectData,
      _: any,
      context: Context,
    ) => {
      const {
        dataSources: { projectAndDripListSupportDb },
      } = context;

      const projectAndDripListSupport =
        await projectAndDripListSupportDb.getProjectAndDripListSupportByProjectId(
          projectData.projectId,
        );

      const oneTimeDonationSupport =
        await projectAndDripListSupportDb.getOneTimeDonationSupportByAccountId(
          projectData.projectId,
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
  Avatar: {
    __resolveType(parent: { cid: string } | { emoji: string }) {
      if ('cid' in parent) {
        return 'ImageAvatar';
      }

      return 'EmojiAvatar';
    },
  },
};

export default projectResolvers;
