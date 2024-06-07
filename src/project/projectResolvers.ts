import type {
  ProjectId,
  ResolverClaimedProjectChainData,
  ResolverClaimedProjectData,
  ResolverProject,
  ResolverUnClaimedProjectChainData,
  ResolverUnClaimedProjectData,
} from '../common/types';
import { toResolverProject, toResolverProjects } from './projectUtils';
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
import validateProjectsInput from './projectValidators';
import type { DripListDataValues } from '../drip-list/DripListModel';
import assert, { isGitHubUrl, isProjectId } from '../utils/assert';
import { resolveTotalEarned } from '../common/commonResolverLogic';
import { validateChainsQueryArg } from '../utils/commonInputValidators';
import getWithdrawableBalances from '../utils/getWithdrawableBalances';

const projectResolvers = {
  Query: {
    projects: async (
      _: undefined,
      args: {
        chains?: SupportedChain[];
        where?: ProjectWhereInput;
        sort?: ProjectSortInput;
      },
      { dataSources: { projectsDataSource } }: Context,
    ): Promise<ResolverProject[]> => {
      validateProjectsInput(args);

      const { chains, where, sort } = args;

      const chainsToQuery = chains?.length ? chains : queryableChains;

      const dbProjects = await projectsDataSource.getProjectsByFilter(
        chainsToQuery,
        where,
        sort,
      );

      return toResolverProjects(chainsToQuery, dbProjects);
    },
    projectById: async (
      _: undefined,
      { id, chain }: { id: ProjectId; chain: SupportedChain },
      { dataSources: { projectsDataSource } }: Context,
    ): Promise<ResolverProject | null> => {
      assert(isProjectId(id));
      assert(chain in SupportedChain);

      const dbProject = await projectsDataSource.getProjectById(id, chain);

      return dbProject ? toResolverProject(chain, dbProject) : null;
    },
    projectByUrl: async (
      _: undefined,
      { url, chain }: { url: string; chain: SupportedChain },
      { dataSources: { projectsDataSource } }: Context,
    ): Promise<ResolverProject | null> => {
      assert(isGitHubUrl(url));
      assert(chain in SupportedChain);

      const dbProject = await projectsDataSource.getProjectByUrl(url, chain);

      return dbProject ? toResolverProject(chain, dbProject) : null;
    },
    earnedFunds: async (
      _: undefined,
      {
        projectId,
        chains,
      }: { projectId: ProjectId; chains?: SupportedChain[] },
      { dataSources: { projectsDataSource } }: Context,
    ): Promise<
      {
        tokenAddress: string;
        amount: string;
        chain: SupportedChain;
      }[]
    > => {
      assert(isProjectId(projectId));
      if (chains?.length) {
        validateChainsQueryArg(chains);
      }

      const chainsToQuery = chains?.length ? chains : queryableChains;

      return projectsDataSource.getEarnedFunds(projectId, chainsToQuery);
    },
  },
  Project: {
    source: (project: ResolverProject): Source => project.source,
    account: (project: ResolverProject): RepoDriverAccount => project.account,
    chainData: (project: ResolverProject): ProjectChainData[] =>
      project.chainData,
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
      {
        parentProjectInfo: { projectId, projectChain },
      }: ResolverClaimedProjectData,
      _: {},
      {
        dataSources: {
          projectsDataSource,
          dripListsDataSource,
          receiversOfTypeAddressDataSource,
          receiversOfTypeProjectDataSource,
          receiversOfTypeDripListDataSource,
        },
      }: Context,
    ): Promise<Splits> => {
      const receiversOfTypeAddressModels =
        await receiversOfTypeAddressDataSource.getReceiversOfTypeAddressByProjectId(
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
        await receiversOfTypeProjectDataSource.getReceiversOfTypeProjectByProjectId(
          projectId,
          [projectChain],
        );

      const splitsOfTypeProjectModels =
        await projectsDataSource.getProjectsByIds(
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
        await receiversOfTypeDripListDataSource.getReceiversOfTypeDripListByProjectId(
          projectId,
          [projectChain],
        );

      const splitsOfTypeDripListModels =
        await dripListsDataSource.getDripListsByIds(
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
      {
        parentProjectInfo: { projectId, projectChain },
      }: ResolverClaimedProjectData,
      _: {},
      { dataSources: { projectAndDripListSupportDataSource } }: Context,
    ) => {
      const projectAndDripListSupport =
        await projectAndDripListSupportDataSource.getProjectAndDripListSupportByProjectId(
          projectId,
          [projectChain],
        );

      const oneTimeDonationSupport =
        await projectAndDripListSupportDataSource.getOneTimeDonationSupportByAccountId(
          [projectChain],
          projectId,
        );

      return [...projectAndDripListSupport, ...oneTimeDonationSupport];
    },
    totalEarned: async (
      projectData: ResolverUnClaimedProjectData,
      _: {},
      context: Context,
    ) => resolveTotalEarned(projectData, context),
    withdrawableBalances: async ({
      parentProjectInfo: { projectId, projectChain },
    }: ResolverUnClaimedProjectData) =>
      getWithdrawableBalances(projectId, projectChain),
  },
  UnClaimedProjectData: {
    verificationStatus: (projectData: ResolverUnClaimedProjectData) =>
      projectData.verificationStatus,
    support: async (
      {
        parentProjectInfo: { projectId, projectChain },
      }: ResolverUnClaimedProjectData,
      _: {},
      { dataSources: { projectAndDripListSupportDataSource } }: Context,
    ) => {
      const projectAndDripListSupport =
        await projectAndDripListSupportDataSource.getProjectAndDripListSupportByProjectId(
          projectId,
          [projectChain],
        );

      const oneTimeDonationSupport =
        await projectAndDripListSupportDataSource.getOneTimeDonationSupportByAccountId(
          [projectChain],
          projectId,
        );

      return [...projectAndDripListSupport, ...oneTimeDonationSupport];
    },
    withdrawableBalances: async ({
      parentProjectInfo: { projectId, projectChain },
    }: ResolverUnClaimedProjectData) =>
      getWithdrawableBalances(projectId, projectChain),
  },
  SplitsReceiver: {
    __resolveType(receiver: SplitsReceiver) {
      if (receiver.driver === Driver.REPO) {
        return 'ProjectReceiver';
      }

      if (receiver.driver === Driver.NFT) {
        return 'DripListReceiver';
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
