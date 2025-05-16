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
import type { DbSchema, NftDriverId, RepoDriverId } from './types';
import getUserAddress from '../utils/getUserAddress';
import type { ProtoStream } from '../utils/buildAssetConfigs';
import { toResolverProject } from '../project/projectUtils';
import { toResolverDripLists } from '../drip-list/dripListUtils';
import mergeAmounts from '../utils/mergeAmounts';
import splitEventsQueries from '../dataLoaders/sqlQueries/splitEventsQueries';
import type projectResolvers from '../project/projectResolvers';
import type { GivenEventModelDataValues } from '../given-event/GivenEventModel';
import type dripListResolvers from '../drip-list/dripListResolvers';
import type ecosystemResolvers from '../ecosystem/ecosystemResolvers';
import type { SplitsReceiverModelDataValues } from '../models/SplitsReceiverModel';
import type { RelationshipType } from '../utils/splitRules';
import { toResolverEcosystems } from '../ecosystem/ecosystemUtils';

async function resolveTotalSplit({
  senderAccountId,
  receiverAccountId,
  chain,
}: SplitsReceiverModelDataValues) {
  const splitEvents = await splitEventsQueries.getByAccountIdAndReceiver(
    [chain],
    senderAccountId,
    receiverAccountId,
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
    splitsToSubAccount: async ({
      splitsToSubAccount,
    }: {
      splitsToSubAccount: boolean;
    }) => splitsToSubAccount,
  },
  SupportItem: {
    __resolveType(
      parent:
        | Awaited<
            ReturnType<typeof projectResolvers.ClaimedProjectData.support>
          >[number]
        | Awaited<ReturnType<typeof dripListResolvers.DripList.support>>[number]
        | Awaited<
            ReturnType<typeof ecosystemResolvers.EcosystemMainAccount.support>
          >[number],
    ) {
      if (
        'dripList' in parent ||
        'project' in parent ||
        'ecosystemMainAccount' in parent ||
        'subList' in parent
      ) {
        const { relationshipType } = parent as {
          relationshipType: RelationshipType;
        };

        if (
          relationshipType === 'project_maintainer' ||
          relationshipType === 'project_dependency'
        ) {
          return 'ProjectSupport';
        }

        if (relationshipType === 'drip_list_receiver') {
          return 'DripListSupport';
        }

        if (
          relationshipType === 'ecosystem_receiver' ||
          relationshipType === 'sub_list_link'
        ) {
          return 'EcosystemSupport';
        }
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
        senderAccountId: RepoDriverId;
        chain: DbSchema;
      },
      _: any,
      context: Context,
    ): Promise<RepoDriverAccount> => {
      const {
        dataSources: { projectsDataSource },
      } = context;

      const { senderAccountId, chain } = parent;

      const project =
        (await projectsDataSource.getProjectByIdOnChain(
          senderAccountId,
          chain,
        )) || shouldNeverHappen();

      return {
        driver: Driver.REPO,
        accountId: project ? project.accountId : shouldNeverHappen(),
      };
    },
    date: (parent: { blockTimestamp: Date }): Date => parent.blockTimestamp,
    weight: (parent: { weight: number }): number => parent.weight,
    project: async (
      parent: {
        senderAccountId: RepoDriverId;
        chain: DbSchema;
        queriedChains: DbSchema[];
      },
      _: any,
      context: Context,
    ) => {
      const {
        dataSources: { projectsDataSource },
      } = context;

      const { senderAccountId, chain } = parent;

      const projectDataValues =
        (await projectsDataSource.getProjectByIdOnChain(
          senderAccountId,
          chain,
        )) || shouldNeverHappen();

      const project = await toResolverProject([chain], projectDataValues);

      return project;
    },
    totalSplit: (parent: SplitsReceiverModelDataValues) =>
      resolveTotalSplit(parent),
  },
  DripListSupport: {
    account: async (
      parent: {
        senderAccountId: NftDriverId;
        chain: DbSchema;
      },
      _: any,
      context: Context,
    ): Promise<NftDriverAccount> => {
      const {
        dataSources: { dripListsDataSource },
      } = context;

      const { senderAccountId, chain } = parent;

      const dripList = await dripListsDataSource.getDripListById(
        senderAccountId,
        [chain],
      );

      return {
        driver: Driver.NFT,
        accountId: dripList ? dripList.accountId : shouldNeverHappen(),
      };
    },
    date: (parent: { blockTimestamp: Date }): Date => parent.blockTimestamp,
    weight: (parent: { weight: number }): number => parent.weight,
    dripList: async (
      parent: { senderAccountId: NftDriverId; chain: DbSchema },
      _: any,
      context: Context,
    ) => {
      const {
        dataSources: { dripListsDataSource },
      } = context;

      const { senderAccountId, chain } = parent;

      const dripListDataValues =
        (await dripListsDataSource.getDripListById(senderAccountId, [chain])) ||
        shouldNeverHappen(`Expected Drip List ${senderAccountId} to exist.`);

      const resolverDripLists = await toResolverDripLists(
        [chain],
        [dripListDataValues],
      );

      const [dripLists] = resolverDripLists;

      return dripLists;
    },
    totalSplit: (parent: SplitsReceiverModelDataValues) =>
      resolveTotalSplit(parent),
  },
  EcosystemSupport: {
    account: async (
      parent: {
        senderAccountId: NftDriverId;
        chain: DbSchema;
      },
      _: any,
      context: Context,
    ): Promise<NftDriverAccount> => {
      const {
        dataSources: { ecosystemsDataSource },
      } = context;

      const { senderAccountId, chain } = parent;

      const ecosystemMainAccount = await ecosystemsDataSource.getEcosystemById(
        senderAccountId,
        [chain],
      );

      return {
        driver: Driver.NFT,
        accountId: ecosystemMainAccount
          ? ecosystemMainAccount.accountId
          : shouldNeverHappen(),
      };
    },
    date: (parent: { blockTimestamp: Date }): Date => parent.blockTimestamp,
    weight: (parent: { weight: number }): number => parent.weight,
    ecosystemMainAccount: async (
      parent: { senderAccountId: NftDriverId; chain: DbSchema },
      _: any,
      context: Context,
    ) => {
      const {
        dataSources: { ecosystemsDataSource },
      } = context;

      const { senderAccountId, chain } = parent;

      const ecosystemMainAccountDataValues =
        (await ecosystemsDataSource.getEcosystemById(senderAccountId, [
          chain,
        ])) || shouldNeverHappen();

      const resolverDripLists = await toResolverEcosystems(
        [chain],
        [ecosystemMainAccountDataValues],
      );

      const [ecosystemMainAccounts] = resolverDripLists;

      return ecosystemMainAccounts;
    },
    totalSplit: (parent: SplitsReceiverModelDataValues) =>
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

      if (receiver.driver === Driver.IMMUTABLE_SPLITS) {
        return 'SubListReceiver';
      }

      return shouldNeverHappen();
    },
  },
};

export default commonResolvers;
