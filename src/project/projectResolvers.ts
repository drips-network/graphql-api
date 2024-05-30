import type {
  ProjectId,
  ResolverClaimedProjectChainData,
  ResolverClaimedProjectData,
  ResolverProject,
  ResolverUnClaimedProjectChainData,
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
import queryableChains from '../common/queryableChains';
import type { ProjectDataValues } from './ProjectModel';
import verifyProjectsInput from './projectValidators';
import type { DripListDataValues } from '../drip-list/DripListModel';
import assert, { isGitHubUrl, isProjectId } from '../utils/assert';
import { resolveTotalEarned } from '../common/commonResolverLogic';

const projectResolvers = {
  Query: {
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
      verifyProjectsInput({ chains, where, sort });

      const chainsToQuery = chains?.length ? chains : queryableChains;

      const projectsDataValues =
        await dataSources.projectsDb.getProjectsByFilter(
          chainsToQuery,
          where,
          sort,
        );

      return toResolverProjects(chainsToQuery, projectsDataValues);
    },
    projectById: async (
      _: any,
      { id, chain }: { id: ProjectId; chain: SupportedChain },
      { dataSources }: Context,
    ): Promise<ResolverProject | null> => {
      assert(isProjectId(id));
      assert(chain in SupportedChain);

      const projectDataValues = await dataSources.projectsDb.getProjectById(
        id,
        chain,
      );

      if (!projectDataValues) {
        return null;
      }

      return (await toResolverProjects([chain], [projectDataValues]))[0];
    },
    projectByUrl: async (
      _: any,
      { url, chain }: { url: string; chain: SupportedChain },
      { dataSources }: Context,
    ): Promise<ResolverProject | null> => {
      assert(isGitHubUrl(url));
      assert(chain in SupportedChain);

      const projectDataValues = await dataSources.projectsDb.getProjectByUrl(
        url,
        chain,
      );

      if (!projectDataValues) {
        return null;
      }

      return (await toResolverProjects([chain], [projectDataValues]))[0];
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
    source: (project: ResolverProject): Source => project.source,
    account: (project: ResolverProject): RepoDriverAccount => project.account,
  },
  ProjectChainData: {
    __resolveType(parent: ProjectChainData) {
      if ('claimedAt' in parent.data) {
        return 'ClaimedProjectChainData';
      }

      return 'UnClaimedProjectChainData';
    },
  },
  ClaimedProjectChainData: {
    chain: (
      chainProjectData: ResolverClaimedProjectChainData,
    ): SupportedChain => chainProjectData.chain,
    data: (chainProjectData: ResolverClaimedProjectChainData) =>
      chainProjectData.data,
  },
  UnClaimedProjectChainData: {
    chain: (
      chainProjectData: ResolverUnClaimedProjectChainData,
    ): SupportedChain => chainProjectData.chain,
    data: (chainProjectData: ResolverUnClaimedProjectChainData) =>
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
      projectData: ResolverClaimedProjectData,
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

      const {
        parentProjectInfo: { projectId, projectChain },
      } = projectData;

      const receiversOfTypeAddressModels =
        await receiversOfTypeAddressDb.getReceiversOfTypeAddressByProjectId(
          projectId,
          [projectChain],
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
          projectId,
          [projectChain],
        );

      const splitsOfTypeProjectModels = await projectsDb.getProjectsByIds(
        receiversOfTypeProjectModels.map((r) => r.fundeeProjectId),
        [projectChain],
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
          projectId,
          [projectChain],
        );

      const splitsOfTypeDripListModels = await dripListsDb.getDripListsByIds(
        receiversOfTypeDripListModels.map((r) => r.fundeeDripListId),
        [projectChain],
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
                (l): l is DripListDataValues =>
                  l && (l as any).id !== undefined,
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
      projectData: ResolverClaimedProjectData,
      _: any,
      context: Context,
    ) => {
      const {
        parentProjectInfo: { projectId, projectChain },
      } = projectData;

      const {
        dataSources: { projectAndDripListSupportDb },
      } = context;

      const projectAndDripListSupport = (
        await projectAndDripListSupportDb.getProjectAndDripListSupportByProjectId(
          projectId,
          [projectChain],
        )
      ).filter((s) => s.chain === projectChain);

      const oneTimeDonationSupport = (
        await projectAndDripListSupportDb.getOneTimeDonationSupportByAccountId(
          projectId,
          [projectChain],
        )
      ).filter((s) => s.chain === projectChain);

      return [...projectAndDripListSupport, ...oneTimeDonationSupport];
    },
    totalEarned: async (
      projectData: ResolverUnClaimedProjectData,
      _: any,
      context: Context,
    ) => resolveTotalEarned(projectData, _, context),
  },
  UnClaimedProjectData: {
    verificationStatus: (projectData: ResolverUnClaimedProjectData) =>
      projectData.verificationStatus,
    support: async (
      projectData: ResolverUnClaimedProjectData,
      _: any,
      context: Context,
    ) => {
      const { projectAndDripListSupportDb } = context.dataSources;

      const {
        parentProjectInfo: { projectId, projectChain },
      } = projectData;

      const projectAndDripListSupport = (
        await projectAndDripListSupportDb.getProjectAndDripListSupportByProjectId(
          projectId,
          [projectChain],
        )
      ).filter((s) => s.chain === projectChain);

      const oneTimeDonationSupport = (
        await projectAndDripListSupportDb.getOneTimeDonationSupportByAccountId(
          projectId,
          [projectChain],
        )
      ).filter((s) => s.chain === projectChain);

      return [...projectAndDripListSupport, ...oneTimeDonationSupport];
    },
    totalEarned: async (
      projectData: ResolverUnClaimedProjectData,
      _: any,
      context: Context,
    ) => resolveTotalEarned(projectData, _, context),
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
