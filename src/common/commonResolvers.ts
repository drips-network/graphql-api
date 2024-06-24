import type {
  AddressDriverAccount,
  Amount,
  DripList,
  NftDriverAccount,
  Project,
  RepoDriverAccount,
  SplitsReceiver,
} from '../generated/graphql';
import { Driver } from '../generated/graphql';
import type { Context } from '../server';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { AddressDriverId, DbSchema, DripListId, ProjectId } from './types';
import { DependencyType } from './types';
import getUserAddress from '../utils/getUserAddress';
import type { ProtoStream } from '../utils/buildAssetConfigs';
import { toResolverProject } from '../project/projectUtils';
import { toResolverDripLists } from '../drip-list/dripListUtils';
import type { RepoDriverSplitReceiverModelDataValues } from '../models/RepoDriverSplitReceiverModel';
import mergeAmounts from '../utils/mergeAmounts';
import type { AddressDriverSplitReceiverModelDataValues } from '../models/AddressDriverSplitReceiverModel';
import { AddressDriverSplitReceiverType } from '../models/AddressDriverSplitReceiverModel';
import splitEventsQueries from '../dataLoaders/sqlQueries/splitEventsQueries';
import type projectResolvers from '../project/projectResolvers';
import type { DripListSplitReceiverModelDataValues } from '../models/DripListSplitReceiverModel';
import type { GivenEventModelDataValues } from '../given-event/GivenEventModel';
import type dripListResolvers from '../drip-list/dripListResolvers';

async function resolveTotalSplit(
  parent:
    | DripListSplitReceiverModelDataValues
    | RepoDriverSplitReceiverModelDataValues
    | AddressDriverSplitReceiverModelDataValues,
) {
  let incomingAccountId: DripListId | ProjectId;
  let recipientAccountId: DripListId | ProjectId | AddressDriverId;

  if ('fundeeDripListId' in parent) {
    const { fundeeDripListId, funderDripListId, funderProjectId } = parent;
    recipientAccountId = fundeeDripListId;
    incomingAccountId =
      funderDripListId || funderProjectId || shouldNeverHappen();
  } else if ('fundeeProjectId' in parent) {
    const { fundeeProjectId, funderDripListId, funderProjectId } = parent;
    recipientAccountId = fundeeProjectId;
    incomingAccountId =
      funderDripListId || funderProjectId || shouldNeverHappen();
  } else if ('fundeeAccountId' in parent) {
    const { fundeeAccountId, funderDripListId, funderProjectId } = parent;

    recipientAccountId = fundeeAccountId;
    incomingAccountId =
      funderDripListId || funderProjectId || shouldNeverHappen();
  } else {
    shouldNeverHappen('Invalid SupportItem type');
  }
  const splitEvents = await splitEventsQueries.getByAccountIdAndReceiver(
    [parent.chain],
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
  AddressReceiver: {
    weight: async ({ weight }: { weight: number }) => weight,
    driver: async ({ driver }: { driver: Driver }) => driver,
    account: async ({ account }: { account: AddressDriverAccount }) => account,
  },
  DripListReceiver: {
    weight: async ({ weight }: { weight: number }) => weight,
    driver: async ({ driver }: { driver: Driver }) => driver,
    dripList: async ({ dripList }: { dripList: DripList }) => dripList,
    account: async ({ account }: { account: NftDriverAccount }) => account,
  },
  ProjectReceiver: {
    weight: async ({ weight }: { weight: number }) => weight,
    driver: async ({ driver }: { driver: Driver }) => driver,
    project: async ({ project }: { project: Project }) => project,
    account: async ({ account }: { account: RepoDriverAccount }) => account,
  },
  SupportItem: {
    __resolveType(
      parent:
        | Awaited<
            ReturnType<typeof projectResolvers.ClaimedProjectData.support>
          >[number]
        | Awaited<
            ReturnType<typeof dripListResolvers.DripList.support>
          >[number],
    ) {
      if ('dripList' in parent || 'project' in parent) {
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

      if ('timeline' in parent) {
        return 'StreamSupport';
      }

      return 'OneTimeDonationSupport';
    },
  },
  ProjectSupport: {
    account: async (
      parent: {
        funderProjectId: ProjectId;
        chain: DbSchema;
      },
      _: any,
      context: Context,
    ): Promise<RepoDriverAccount> => {
      const {
        dataSources: { projectsDataSource },
      } = context;

      const { funderProjectId, chain } = parent;

      const project =
        (await projectsDataSource.getProjectByIdOnChain(
          funderProjectId,
          chain,
        )) || shouldNeverHappen();

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
        chain: DbSchema;
        queriedChains: DbSchema[];
      },
      _: any,
      context: Context,
    ) => {
      const {
        dataSources: { projectsDataSource },
      } = context;

      const { funderProjectId, chain } = parent;

      const projectDataValues =
        (await projectsDataSource.getProjectByIdOnChain(
          funderProjectId,
          chain,
        )) || shouldNeverHappen();

      const project = await toResolverProject([chain], projectDataValues);

      return project;
    },
    totalSplit: (parent: RepoDriverSplitReceiverModelDataValues) =>
      resolveTotalSplit(parent),
  },
  DripListSupport: {
    account: async (
      parent: {
        funderDripListId: DripListId;
        chain: DbSchema;
      },
      _: any,
      context: Context,
    ): Promise<NftDriverAccount> => {
      const {
        dataSources: { dripListsDataSource },
      } = context;

      const { funderDripListId, chain } = parent;

      const dripList = await dripListsDataSource.getDripListById(
        funderDripListId,
        [chain],
      );

      return {
        driver: Driver.NFT,
        accountId: dripList ? dripList.id : shouldNeverHappen(),
      };
    },
    date: (parent: { blockTimestamp: Date }): Date => parent.blockTimestamp,
    weight: (parent: { weight: number }): number => parent.weight,
    dripList: async (
      parent: { funderDripListId: DripListId; chain: DbSchema },
      _: any,
      context: Context,
    ) => {
      const {
        dataSources: { dripListsDataSource },
      } = context;

      const { funderDripListId, chain } = parent;

      const dripListDataValues =
        (await dripListsDataSource.getDripListById(funderDripListId, [
          chain,
        ])) || shouldNeverHappen();

      const resolverDripLists = await toResolverDripLists(
        [chain],
        [dripListDataValues],
      );

      const [dripLists] = resolverDripLists;

      return dripLists;
    },
    totalSplit: (parent: DripListSplitReceiverModelDataValues) =>
      resolveTotalSplit(parent),
  },
  OneTimeDonationSupport: {
    account: async (
      parent: GivenEventModelDataValues,
      _: any,
      context: Context,
    ): Promise<AddressDriverAccount> => {
      const {
        dataSources: { givenEventsDataSource },
      } = context;

      const { transactionHash, logIndex, chain } = parent;

      const givenEvent =
        (await givenEventsDataSource.getGivenEventByIdOnChain(
          chain,
          transactionHash,
          logIndex,
        )) || shouldNeverHappen("Expected 'GivenEvent' to exist.");

      return {
        driver: Driver.ADDRESS,
        accountId: givenEvent.accountId,
        address: getUserAddress(givenEvent.accountId),
      };
    },
    amount: (parent: GivenEventModelDataValues): Amount => ({
      tokenAddress: parent.erc20,
      amount: parent.amt,
    }),
    date: (parent: GivenEventModelDataValues): Date => parent.blockTimestamp,
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
};

export default commonResolvers;
