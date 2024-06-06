import type {
  AddressDriverAccount,
  Amount,
  NftDriverAccount,
  RepoDriverAccount,
  SupportedChain,
} from '../generated/graphql';
import { Driver } from '../generated/graphql';
import type GivenEventModel from '../given-event/GivenEventModel';
import DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';
import type { Context } from '../server';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { AddressDriverId, DripListId, ProjectId } from './types';
import { DependencyType } from './types';
import getUserAddress from '../utils/getUserAddress';
import type { ProtoStream } from '../utils/buildAssetConfigs';
import { toResolverProjects } from '../project/projectUtils';
import { toResolverDripLists } from '../drip-list/dripListUtils';
import RepoDriverSplitReceiverModel from '../models/RepoDriverSplitReceiverModel';
import mergeAmounts from '../utils/mergeAmounts';
import AddressDriverSplitReceiverModel, {
  AddressDriverSplitReceiverType,
} from '../models/AddressDriverSplitReceiverModel';
import splitEventsQueries from '../dataLoaders/sqlQueries/splitEventsQueries';

async function resolveTotalSplit(
  chains: SupportedChain[],
  parent:
    | DripListSplitReceiverModel
    | RepoDriverSplitReceiverModel
    | AddressDriverSplitReceiverModel,
) {
  let incomingAccountId: DripListId | ProjectId;
  let recipientAccountId: DripListId | ProjectId | AddressDriverId;

  if (parent instanceof DripListSplitReceiverModel) {
    const { fundeeDripListId, funderDripListId, funderProjectId } = parent;
    recipientAccountId = fundeeDripListId;
    incomingAccountId =
      funderDripListId || funderProjectId || shouldNeverHappen();
  } else if (parent instanceof RepoDriverSplitReceiverModel) {
    const { fundeeProjectId, funderDripListId, funderProjectId } = parent;
    recipientAccountId = fundeeProjectId;
    incomingAccountId =
      funderDripListId || funderProjectId || shouldNeverHappen();
  } else if (parent instanceof AddressDriverSplitReceiverModel) {
    const { fundeeAccountId, funderDripListId, funderProjectId } = parent;

    recipientAccountId = fundeeAccountId;
    incomingAccountId =
      funderDripListId || funderProjectId || shouldNeverHappen();
  } else {
    shouldNeverHappen('Invalid SupportItem type');
  }

  const splitEvents = await splitEventsQueries.getByAccountIdAndReceiver(
    chains,
    incomingAccountId,
    recipientAccountId,
  );

  return mergeAmounts(
    splitEvents.map((splitEvent) => ({
      tokenAddress: splitEvent.erc20,
      amount: BigInt(splitEvent.amt),
      chain: splitEvent.chain,
    })),
  ).map((amount) => ({
    ...amount,
    amount: amount.amount.toString(),
  }));
}

const commonResolvers = {
  SupportItem: {
    __resolveType(
      parent:
        | DripListSplitReceiverModel
        | RepoDriverSplitReceiverModel
        | AddressDriverSplitReceiverModel
        | GivenEventModel
        | ProtoStream,
    ) {
      if ('funderDripListId' in parent || 'funderProjectId' in parent) {
        const { type } = parent as any;

        if (
          type === DependencyType.ProjectDependency ||
          type === AddressDriverSplitReceiverType.ProjectDependency ||
          type === AddressDriverSplitReceiverType.ProjectMaintainer
        ) {
          return 'ProjectSupport';
        }

        if (
          type === DependencyType.DripListDependency ||
          type === AddressDriverSplitReceiverType.DripListDependency
        ) {
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
        chain: SupportedChain;
      },
      _: any,
      context: Context,
    ): Promise<RepoDriverAccount> => {
      const {
        dataSources: { projectsDataSource },
      } = context;

      const { funderProjectId, chain } = parent;

      const project = await projectsDataSource.getProjectById(
        funderProjectId,
        chain,
      );

      return {
        driver: Driver.REPO,
        accountId: project ? project.id : shouldNeverHappen(),
      };
    },
    date: (parent: { blockTimestamp: Date }): Date => parent.blockTimestamp,
    weight: (parent: { weight: number }): number => parent.weight,
    project: async (
      parent: {
        funderProjectId: ProjectId;
        chain: SupportedChain;
        queriedChains: SupportedChain[];
      },
      _: any,
      context: Context,
    ) => {
      const {
        dataSources: { projectsDataSource },
      } = context;

      const { funderProjectId, chain } = parent;

      const projectDataValues =
        (await projectsDataSource.getProjectById(funderProjectId, chain)) ||
        shouldNeverHappen();

      const resolverProjects = await toResolverProjects(
        [chain],
        [projectDataValues],
      );

      const [project] = resolverProjects;

      return project;
    },
    totalSplit: resolveTotalSplit,
  },
  DripListSupport: {
    account: async (
      parent: {
        funderDripListId: DripListId;
        chain: SupportedChain;
      },
      _: any,
      context: Context,
    ): Promise<NftDriverAccount> => {
      const {
        dataSources: { dripListsDataSource },
      } = context;

      const { funderDripListId, chain } = parent;

      const dripList = await dripListsDataSource.getDripListById(
        [chain],
        funderDripListId,
      );

      return {
        driver: Driver.NFT,
        accountId: dripList ? dripList.id : shouldNeverHappen(),
      };
    },
    date: (parent: { blockTimestamp: Date }): Date => parent.blockTimestamp,
    weight: (parent: { weight: number }): number => parent.weight,
    dripList: async (
      parent: { funderDripListId: DripListId; chain: SupportedChain },
      _: any,
      context: Context,
    ) => {
      const {
        dataSources: { dripListsDataSource },
      } = context;

      const { funderDripListId, chain } = parent;

      const dripListDataValues =
        (await dripListsDataSource.getDripListById(
          [chain],
          funderDripListId,
        )) || shouldNeverHappen();

      const resolverDripLists = await toResolverDripLists(
        [chain],
        [dripListDataValues],
      );

      const [dripLists] = resolverDripLists;

      return dripLists;
    },
    totalSplit: resolveTotalSplit,
  },
  OneTimeDonationSupport: {
    account: async (
      parent: {
        transactionHash: string;
        logIndex: number;
        chain: SupportedChain;
      },
      _: any,
      context: Context,
    ): Promise<AddressDriverAccount> => {
      const {
        dataSources: { givenEventsDataSource },
      } = context;

      const { transactionHash, logIndex, chain } = parent;

      const givenEvent = await givenEventsDataSource.getGivenEventById(
        [chain],
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
