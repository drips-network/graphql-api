import type {
  AddressDriverAccount,
  Amount,
  NftDriverAccount,
  RepoDriverAccount,
} from '../generated/graphql';
import { Driver } from '../generated/graphql';
import GivenEventModel from '../given-event/GivenEventModel';
import DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';
import type { Context } from '../server';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { DripListId, ProjectId } from './types';
import { DependencyType } from './types';
import getUserAddress from '../utils/getUserAddress';
import RepoDriverSplitReceiverModel from '../models/RepoDriverSplitReceiverModel';
import type { ProtoStream } from '../utils/buildAssetConfigs';
import SplitEventModel from '../models/SplitEventModel';
import mergeAmounts from '../utils/mergeAmounts';

async function resolveTotalSplit(
  parent: DripListSplitReceiverModel | RepoDriverSplitReceiverModel,
) {
  let incomingAccountId: DripListId | ProjectId;
  let recipientAccountId: DripListId | ProjectId;

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
  } else {
    shouldNeverHappen('Invalid SupportItem type');
  }

  const splitEvents = await SplitEventModel.findAll({
    where: {
      accountId: incomingAccountId,
      receiver: recipientAccountId,
    },
  });

  return mergeAmounts(
    splitEvents.map((splitEvent) => ({
      tokenAddress: splitEvent.erc20,
      amount: BigInt(splitEvent.amt),
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
        | GivenEventModel
        | ProtoStream,
    ) {
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

      return 'StreamSupport';
    },
  },
  ProjectSupport: {
    account: async (
      parent: { funderProjectId: ProjectId; weight: number },
      _: any,
      context: Context,
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
    date: (parent: { blockTimestamp: Date }): Date => parent.blockTimestamp,
    weight: (parent: { weight: number }): number => parent.weight,
    project: (
      parent: { funderProjectId: ProjectId },
      _: any,
      context: Context,
    ) => {
      const {
        dataSources: { projectsDb },
      } = context;

      return projectsDb.getProjectById(parent.funderProjectId);
    },
    totalSplit: resolveTotalSplit,
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
    totalSplit: resolveTotalSplit,
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
