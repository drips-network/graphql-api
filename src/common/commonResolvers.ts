import type {
  AddressDriverAccount,
  Amount,
  NftDriverAccount,
  RepoDriverAccount,
  SupportedChain,
} from '../generated/graphql';
import { Driver } from '../generated/graphql';
import type { GivenEventModelDataValues } from '../given-event/GivenEventModel';
import type GivenEventModel from '../given-event/GivenEventModel';
import type DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';
import type { Context } from '../server';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { DripListId, ProjectId } from './types';
import { DependencyType } from './types';
import getUserAddress from '../utils/getUserAddress';
import type { ProtoStream } from '../utils/buildAssetConfigs';
import type { RepoDriverSplitReceiverModelDataValues } from '../models/RepoDriverSplitReceiverModel';

const commonResolvers = {
  SupportItem: {
    __resolveType(
      parent:
        | DripListSplitReceiverModel
        | RepoDriverSplitReceiverModelDataValues
        | GivenEventModelDataValues
        | ProtoStream,
    ) {
      if ('funderDripListId' in parent || 'funderProjectId' in parent) {
        // TODO: Fix these type assertions.
        if ((parent as any).type === DependencyType.ProjectDependency) {
          return 'ProjectSupport';
        }

        if ((parent as any).type === DependencyType.DripListDependency) {
          return 'DripListSupport';
        }

        return shouldNeverHappen('Invalid SupportItem type');
      }

      if ('receiver' in parent) {
        return 'OneTimeDonationSupport';
      }

      return 'StreamSupport';
    },
  },
  ProjectSupport: {
    account: async (
      parent: {
        funderProjectId: ProjectId;
        weight: number;
        chain: SupportedChain;
      },
      _: any,
      context: Context,
    ): Promise<RepoDriverAccount> => {
      const {
        dataSources: { projectsDb },
      } = context;

      const { funderProjectId, chain } = parent;

      const project = await projectsDb.getProjectById(funderProjectId, chain);

      return {
        driver: Driver.REPO,
        accountId: project ? project.id : shouldNeverHappen(),
      };
    },
    date: (parent: { blockTimestamp: Date }): Date => parent.blockTimestamp,
    weight: (parent: { weight: number }): number => parent.weight,
    project: (
      parent: { funderProjectId: ProjectId; chain: SupportedChain },
      _: any,
      context: Context,
    ) => {
      const {
        dataSources: { projectsDb },
      } = context;

      const { funderProjectId, chain } = parent;

      return projectsDb.getProjectById(funderProjectId, chain);
    },
  },
  DripListSupport: {
    account: async (
      parent: { funderDripListId: DripListId; weight: number },
      _: any,
      context: Context,
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
    date: (parent: { blockTimestamp: Date }): Date => parent.blockTimestamp,
    weight: (parent: { weight: number }): number => parent.weight,
    dripList: (
      parent: { funderDripListId: DripListId },
      _: any,
      context: Context,
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
      context: Context,
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
    date: (parent: { blockTimestamp: Date }): Date => parent.blockTimestamp,
  },
  StreamSupport: {
    account: async (parent: ProtoStream): Promise<AddressDriverAccount> =>
      parent.sender,
    stream: (parent: ProtoStream) => parent,
    date: (parent: ProtoStream) => parent.createdAt,
  },
  SupportGroup: {
    // TODO: implement.
  },
};

export default commonResolvers;
