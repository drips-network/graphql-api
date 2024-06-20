import type {
  ProjectId,
  ResolverClaimedProjectData,
  ResolverProject,
  ResolverUnClaimedProjectData,
} from '../common/types';
import {
  mergeProjects,
  toResolverProject,
  toResolverProjects,
} from './projectUtils';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import { Driver } from '../generated/graphql';
import type {
  Source,
  RepoDriverAccount,
  AddressDriverAccount,
  AddressReceiver,
  ProjectWhereInput,
  ProjectSortInput,
  Avatar,
  SupportedChain,
  ProjectData,
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
import { toResolverDripList } from '../drip-list/dripListUtils';
import { chainToDbSchema } from '../utils/chainSchemaMappings';

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

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      const dbProjects = await projectsDataSource.getProjectsByFilter(
        dbSchemasToQuery,
        where,
        sort,
      );

      return toResolverProjects(dbSchemasToQuery, dbProjects);
    },
    projectById: async (
      _: undefined,
      { id, chains }: { id: ProjectId; chains?: SupportedChain[] },
      { dataSources: { projectsDataSource } }: Context,
    ): Promise<ResolverProject | null> => {
      assert(isProjectId(id));
      if (chains?.length) {
        validateChainsQueryArg(chains);
      }

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      const dbProjects = await projectsDataSource.getProjectById(
        id,
        dbSchemasToQuery,
      );

      return dbProjects ? mergeProjects(dbProjects, dbSchemasToQuery) : null;
    },
    projectByUrl: async (
      _: undefined,
      { url, chains }: { url: string; chains?: SupportedChain[] },
      { dataSources: { projectsDataSource } }: Context,
    ): Promise<ResolverProject | null> => {
      assert(isGitHubUrl(url));
      if (chains?.length) {
        validateChainsQueryArg(chains);
      }

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      const dbProjects = await projectsDataSource.getProjectByUrl(
        url,
        dbSchemasToQuery,
      );

      return dbProjects ? mergeProjects(dbProjects, dbSchemasToQuery) : null;
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

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      return projectsDataSource.getEarnedFunds(projectId, dbSchemasToQuery);
    },
  },
  Project: {
    source: (project: ResolverProject): Source => project.source,
    account: (project: ResolverProject): RepoDriverAccount => project.account,
    chainData: (project: ResolverProject): ProjectData[] => project.chainData,
  },
  ProjectData: {
    __resolveType(parent: ProjectData) {
      if ('claimedAt' in parent && !!parent.claimedAt) {
        return 'ClaimedProjectData';
      }

      return 'UnClaimedProjectData';
    },
  },
  ClaimedProjectData: {
    verificationStatus: (projectData: ResolverClaimedProjectData) =>
      projectData.verificationStatus,
    color: (projectData: any): string => projectData.color,
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
    ) => {
      const receiversOfTypeAddressModels =
        await receiversOfTypeAddressDataSource.getReceiversOfTypeAddressByProjectIdOnChain(
          projectId,
          projectChain,
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
        await receiversOfTypeProjectDataSource.getReceiversOfTypeProjectByProjectIdOnChain(
          projectId,
          projectChain,
        );

      const splitsOfTypeProjectModels =
        await projectsDataSource.getProjectsByIdsOnChain(
          receiversOfTypeProjectModels.map((r) => r.fundeeProjectId),
          projectChain,
        );

      const dependenciesOfTypeProject = await Promise.all(
        receiversOfTypeProjectModels.map(async (receiver) => ({
          driver: Driver.REPO,
          weight: receiver.weight,
          receiverType: receiver.type,
          account: {
            driver: Driver.REPO,
            accountId: receiver.fundeeProjectId,
          },
          project: await toResolverProject(
            [projectChain],
            splitsOfTypeProjectModels
              .filter(
                (p): p is ProjectDataValues => p && (p as any).id !== undefined,
              )
              .find(
                (p) => p.id === receiver.fundeeProjectId,
              ) as unknown as ProjectDataValues,
          ),
        })),
      );

      const receiversOfTypeDripListModels =
        await receiversOfTypeDripListDataSource.getReceiversOfTypeDripListByProjectIdOnChain(
          projectId,
          projectChain,
        );

      const splitsOfTypeDripListModels =
        await dripListsDataSource.getDripListsByIdsOnChain(
          receiversOfTypeDripListModels.map((r) => r.fundeeDripListId),
          projectChain,
        );

      const dripListReceivers = await Promise.all(
        receiversOfTypeDripListModels.map(async (receiver) => ({
          driver: Driver.NFT,
          weight: receiver.weight,
          account: {
            driver: Driver.NFT,
            accountId: receiver.fundeeDripListId,
          },
          dripList: await toResolverDripList(
            projectChain,
            (splitsOfTypeDripListModels
              .filter(
                (l): l is DripListDataValues =>
                  l && (l as any).id !== undefined,
              )
              .find(
                (p) => (p as any).id === receiver.fundeeDripListId,
              ) as unknown as DripListDataValues) || shouldNeverHappen(),
          ),
        })),
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
      {
        dataSources: {
          projectsDataSource,
          dripListsDataSource,
          projectAndDripListSupportDataSource,
        },
      }: Context,
    ) => {
      // `RepoDriverSplitReceiver`s that represent the Project as a receiver.
      const dbRepoDriverSplitReceivers =
        await projectAndDripListSupportDataSource.getProjectAndDripListSupportByProjectIdOnChain(
          projectId,
          projectChain,
        );

      const projectsAndDripListsSupport = await Promise.all(
        dbRepoDriverSplitReceivers.map(async (receiver) => {
          const {
            funderProjectId,
            funderDripListId,
            fundeeProjectId,
            blockTimestamp,
          } = receiver;

          // Support is a Project.
          if (funderProjectId && !funderDripListId) {
            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: fundeeProjectId,
              },
              date: blockTimestamp,
              totalSplit: [],
              project: await toResolverProject(
                [projectChain],
                (await projectsDataSource.getProjectByIdOnChain(
                  funderProjectId,
                  projectChain,
                )) || shouldNeverHappen(),
              ),
            };
            // Support is a DripList.
          }
          if (funderDripListId && !funderProjectId) {
            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: fundeeProjectId,
              },
              date: blockTimestamp,
              totalSplit: [],
              dripList: await toResolverDripList(
                projectChain,
                (await dripListsDataSource.getDripListById(funderDripListId, [
                  projectChain,
                ])) || shouldNeverHappen(),
              ),
            };
          }

          return shouldNeverHappen(
            'Supported is neither a Project nor a DripList.',
          );
        }),
      );

      // `GivenEventModelDataValues`s that represent one time donations to the Project.
      const oneTimeDonationSupport =
        await projectAndDripListSupportDataSource.getOneTimeDonationSupportByAccountIdOnChain(
          projectId,
          projectChain,
        );

      return [...projectsAndDripListsSupport, ...oneTimeDonationSupport];
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
      {
        dataSources: {
          projectsDataSource,
          dripListsDataSource,
          projectAndDripListSupportDataSource,
        },
      }: Context,
    ) => {
      // `RepoDriverSplitReceiver`s that represent the Project as a receiver.
      const dbRepoDriverSplitReceivers =
        await projectAndDripListSupportDataSource.getProjectAndDripListSupportByProjectIdOnChain(
          projectId,
          projectChain,
        );

      const projectsAndDripListsSupport = await Promise.all(
        dbRepoDriverSplitReceivers.map(async (receiver) => {
          const {
            funderProjectId,
            funderDripListId,
            fundeeProjectId,
            blockTimestamp,
          } = receiver;

          // Support is a Project.
          if (funderProjectId && !funderDripListId) {
            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: fundeeProjectId,
              },
              date: blockTimestamp,
              totalSplit: [],
              project: await toResolverProject(
                [projectChain],
                (await projectsDataSource.getProjectByIdOnChain(
                  funderProjectId,
                  projectChain,
                )) || shouldNeverHappen(),
              ),
            };
            // Support is a DripList.
          }
          if (funderDripListId && !funderProjectId) {
            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: fundeeProjectId,
              },
              date: blockTimestamp,
              totalSplit: [],
              dripList: await toResolverDripList(
                projectChain,
                (await dripListsDataSource.getDripListById(funderDripListId, [
                  projectChain,
                ])) || shouldNeverHappen(),
              ),
            };
          }

          return shouldNeverHappen(
            'Supported is neither a Project nor a DripList.',
          );
        }),
      );

      // `GivenEventModelDataValues`s that represent one time donations to the Project.
      const oneTimeDonationSupport =
        await projectAndDripListSupportDataSource.getOneTimeDonationSupportByAccountIdOnChain(
          projectId,
          projectChain,
        );

      return [...projectsAndDripListsSupport, ...oneTimeDonationSupport];
    },
    withdrawableBalances: async ({
      parentProjectInfo: { projectId, projectChain },
    }: ResolverUnClaimedProjectData) =>
      getWithdrawableBalances(projectId, projectChain),
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
