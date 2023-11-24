import type {
  AddressDriverAccount,
  Amount,
  NftDriverAccount,
  RepoDriverAccount,
} from '../generated/graphql';
import { Driver } from '../generated/graphql';
import GivenEventModel from '../given-event/GivenEventModel';
import DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';
import type { ContextValue } from '../server';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { DripListId, ProjectId } from './types';
import { DependencyType } from './types';
import getUserAddress from '../utils/getUserAddress';
import RepoDriverSplitReceiverModel from '../models/RepoDriverSplitReceiverModel';

const commonResolvers = {
  SupportItem: {
    __resolveType(parent: any) {
      if (
        parent instanceof DripListSplitReceiverModel ||
        parent instanceof RepoDriverSplitReceiverModel
      ) {
        if (parent.type === DependencyType.ProjectDependency) {
          return 'ProjectSupport';
        }

        if (parent.type === DependencyType.DripListDependency) {
          return 'DripListSupport';
        }

        return shouldNeverHappen('Invalid SupportItem type');
      }

      if (parent instanceof GivenEventModel) {
        return 'OneTimeDonationSupport';
      }

      return shouldNeverHappen('Invalid SupportItem type');
    },
  },
  ProjectSupport: {
    account: async (
      parent: { funderProjectId: ProjectId; weight: number },
      _: any,
      context: ContextValue,
    ): Promise<RepoDriverAccount> => {
      const {
        dataSources: { projectsDb },
      } = context;

      const project = await projectsDb.getProjectById(parent.funderProjectId);

      return {
        driver: Driver.REPO,
        accountId: project ? project.id : shouldNeverHappen(),
      };
    },
    date: (parent: { createdAt: Date }): Date => parent.createdAt,
    weight: (parent: { weight: number }): number => parent.weight,
    project: (
      parent: { funderProjectId: ProjectId },
      _: any,
      context: ContextValue,
    ) => {
      const {
        dataSources: { projectsDb },
      } = context;

      return projectsDb.getProjectById(parent.funderProjectId);
    },
  },
  DripListSupport: {
    account: async (
      parent: { funderDripListId: DripListId; weight: number },
      _: any,
      context: ContextValue,
    ): Promise<NftDriverAccount> => {
      const {
        dataSources: { dripListsDb },
      } = context;

      const dripList = await dripListsDb.getDripListById(
        parent.funderDripListId,
      );

      return {
        driver: Driver.NFT,
        accountId: dripList ? dripList.id : shouldNeverHappen(),
      };
    },
    date: (parent: { createdAt: Date }): Date => parent.createdAt,
    weight: (parent: { weight: number }): number => parent.weight,
    dripList: (
      parent: { funderDripListId: DripListId },
      _: any,
      context: ContextValue,
    ) => {
      const {
        dataSources: { dripListsDb },
      } = context;

      return dripListsDb.getDripListById(parent.funderDripListId);
    },
  },
  OneTimeDonationSupport: {
    account: async (
      parent: { transactionHash: string; logIndex: number },
      _: any,
      context: ContextValue,
    ): Promise<AddressDriverAccount> => {
      const {
        dataSources: { givesDb },
      } = context;

      const { transactionHash, logIndex } = parent;

      const givenEvent = await givesDb.getGivenEventById(
        transactionHash,
        logIndex,
      );

      return {
        driver: Driver.ADDRESS,
        accountId: givenEvent.accountId,
        address: getUserAddress(givenEvent.accountId),
      };
    },
    amount: (parent: GivenEventModel): Amount => ({
      tokenAddress: parent.erc20,
      amount: parent.amt,
    }),
    date: (parent: { createdAt: Date }): Date => parent.createdAt,
  },
  SupportGroup: {
    // TODO: implement.
  },
};

export default commonResolvers;
