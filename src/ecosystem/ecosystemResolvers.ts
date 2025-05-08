import type {
  NftDriverId,
  ResolverEcosystem,
  ResolverEcosystemData,
} from '../common/types';
import type {
  AddressDriverAccount,
  NftDriverAccount,
} from '../generated/graphql';
import { Driver, SupportedChain } from '../generated/graphql';
import type { Context } from '../server';
import assert, {
  assertIsNftDriverId,
  assertIsRepoDriverId,
  isNftDriverId,
} from '../utils/assert';
import { resolveTotalEarned } from '../common/commonResolverLogic';
import { chainToDbSchema } from '../utils/chainSchemaMappings';
import { getLatestMetadataHashOnChain } from '../utils/getLatestAccountMetadata';
import { toResolverEcosystem } from './ecosystemUtils';
import { toResolverDripList } from '../drip-list/dripListUtils';
import { toResolverProject } from '../project/projectUtils';
import shouldNeverHappen from '../utils/shouldNeverHappen';

const ecosystemResolvers = {
  Query: {
    ecosystemMainAccount: async (
      _: undefined,
      { id, chain }: { id: NftDriverId; chain: SupportedChain },
      { dataSources: { ecosystemsDataSource } }: Context,
    ): Promise<ResolverEcosystem | null> => {
      assert(isNftDriverId(id));
      assert(chain in SupportedChain);

      const dbSchemaToQuery = chainToDbSchema[chain];

      const dbEcosystem = await ecosystemsDataSource.getEcosystemById(id, [
        dbSchemaToQuery,
      ]);

      return dbEcosystem
        ? toResolverEcosystem(dbSchemaToQuery, dbEcosystem)
        : null;
    },
  },
  EcosystemMainAccount: {
    account: (ecosystem: ResolverEcosystem): NftDriverAccount =>
      ecosystem.account,
    name: (ecosystemData: ResolverEcosystemData) =>
      ecosystemData.name ?? 'Unnamed Ecosystem',
    isVisible: ({ isVisible }: ResolverEcosystemData) => isVisible,
    creator: (dripListData: ResolverEcosystemData) => dripListData.creator,
    description: (dripListData: ResolverEcosystemData) =>
      dripListData.description,
    previousOwnerAddress: (dripListData: ResolverEcosystemData) =>
      dripListData.previousOwnerAddress,
    owner: (dripListData: ResolverEcosystemData): AddressDriverAccount =>
      dripListData.owner,
    // TODO: Implement splits resolver
    // splits: async (
    //   {
    //     parentEcosystemInfo: { ecosystemId, ecosystemChain },
    //   }: ResolverEcosystemData,
    //   _: {},
    //   {
    //     dataSources: {
    //       projectsDataSource,
    //       dripListsDataSource,
    //       splitsReceiversDataSource,
    //     },
    //   }: Context,
    // ) => {
    // const splitsReceivers =
    //   await splitsReceiversDataSource.getSplitsReceiversOnChain(
    //     ecosystemId,
    //     ecosystemChain,
    //   );
    // assertMany(
    //   splitsReceivers.map((s) => s.relationshipType),
    //   (s) => s === 'ecosystem_receiver',
    // );
    // assertMany(
    //   splitsReceivers.map((s) => s.receiverAccountType),
    //   (s) => s === 'project' || s === 'sub_list',
    // );
    // const splitReceiversByReceiverAccountType = groupBy(
    //   splitsReceivers,
    //   (s) => s.receiverAccountType,
    // );
    // const addressDependencies = (
    //   splitReceiversByReceiverAccountType.get('address') || []
    // ).map((s) => ({
    //   ...s,
    //   driver: Driver.ADDRESS,
    //   account: {
    //     driver: Driver.ADDRESS,
    //     accountId: s.receiverAccountId,
    //     address: getUserAddress(s.receiverAccountId),
    //   },
    // }));
    // const projectReceivers =
    //   splitReceiversByReceiverAccountType.get('project') || [];
    // const subListReceivers =
    //   splitReceiversByReceiverAccountType.get('drip_list') || [];
    // const [projects, subLists] = await Promise.all([
    //   projectReceivers.length > 0
    //     ? projectsDataSource.getProjectsByIdsOnChain(
    //         projectReceivers.map(
    //           (r) => r.receiverAccountId,
    //         ) as RepoDriverId[],
    //         ecosystemChain,
    //       )
    //     : [],
    //   subListReceivers.length > 0
    //     ? dripListsDataSource.getDripListsByIdsOnChain(
    //         subListReceivers.map(
    //           (r) => r.receiverAccountId,
    //         ) as ImmutableSplitsDriverId[],
    //         ecosystemChain,
    //       )
    //     : [],
    // ]);
    // const projectsMap = new Map(
    //   projects
    //     .filter(
    //       (p): p is ProjectDataValues => p.accountId !== undefined,
    //     )
    //     .map((p) => [p.accountId, p]),
    // );
    // const subListsMap = new Map(
    //   subListsMap
    //     .filter(
    //       (l): l is SubListDataValues => l.accountId !== undefined,
    //     )
    //     .map((l) => [l.accountId, l]),
    // );
    // const projectDependencies = await Promise.all(
    //   projectReceivers.map(async (s) => {
    //     assertIsRepoDriverId(s.receiverAccountId);
    //     const project = projectsMap.get(s.receiverAccountId);
    //     return {
    //       ...s,
    //       driver: Driver.REPO,
    //       account: {
    //         driver: Driver.REPO,
    //         accountId: s.receiverAccountId,
    //       },
    //       project: project
    //         ? await toResolverProject(
    //             [ecosystemChain],
    //             project as unknown as ProjectDataValues,
    //           )
    //         : undefined,
    //     };
    //   }),
    // );
    // const dripListDependencies = await Promise.all(
    //   dripListReceivers.map(async (s) => {
    //     assertIsNftDriverId(s.receiverAccountId);
    //     const dripList = dripListsMap.get(s.receiverAccountId);
    //     return {
    //       ...s,
    //       driver: Driver.NFT,
    //       account: {
    //         driver: Driver.NFT,
    //         accountId: s.receiverAccountId,
    //       },
    //       dripList: dripList
    //         ? await toResolverDripList(
    //             ecosystemChain,
    //             dripList as unknown as DripListDataValues,
    //           )
    //         : shouldNeverHappen(),
    //     };
    //   }),
    // );
    // return {
    //   ...addressDependencies,
    //   ...projectDependencies,
    //   ...dripListDependencies,
    // };
    // },
    support: async (
      {
        parentEcosystemInfo: { ecosystemId, ecosystemChain },
      }: ResolverEcosystemData,
      _: {},
      {
        dataSources: {
          projectsDataSource,
          dripListsDataSource,
          supportDataSource,
        },
      }: Context,
    ) => {
      const splitReceivers =
        await supportDataSource.getSplitSupportByReceiverIdOnChain(
          ecosystemId,
          ecosystemChain,
        );

      const projectsAndDripListsSupport = await Promise.all(
        splitReceivers.map(async (receiver) => {
          const {
            senderAccountId,
            receiverAccountId,
            blockTimestamp,
            senderAccountType,
          } = receiver;

          if (senderAccountType === 'project') {
            assertIsRepoDriverId(senderAccountId);

            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: receiverAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              project: await toResolverProject(
                [ecosystemChain],
                (await projectsDataSource.getProjectByIdOnChain(
                  senderAccountId,
                  ecosystemChain,
                )) || shouldNeverHappen(),
              ),
            };
          }
          if (senderAccountType === 'drip_list') {
            assertIsNftDriverId(senderAccountId);

            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: receiverAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              dripList: await toResolverDripList(
                ecosystemChain,
                (await dripListsDataSource.getDripListById(senderAccountId, [
                  ecosystemChain,
                ])) || shouldNeverHappen(),
              ),
            };
          }

          return shouldNeverHappen(
            'Supported is neither a Project nor a DripList.',
          );
        }),
      );

      const oneTimeDonationSupport =
        await supportDataSource.getOneTimeDonationSupportByAccountIdOnChain(
          ecosystemId,
          ecosystemChain,
        );

      const streamSupport =
        await supportDataSource.getStreamSupportByAccountIdOnChain(
          ecosystemId,
          ecosystemChain,
        );

      return [
        ...projectsAndDripListsSupport,
        ...oneTimeDonationSupport,
        ...streamSupport,
      ];
    },
    totalEarned: async (
      ecosystemData: ResolverEcosystemData,
      _: {},
      context: Context,
    ) => resolveTotalEarned(ecosystemData, context),
    latestMetadataIpfsHash: async ({
      parentEcosystemInfo: { ecosystemChain, ecosystemId },
    }: ResolverEcosystemData) =>
      getLatestMetadataHashOnChain(ecosystemId, ecosystemChain),
    lastProcessedIpfsHash: (ecosystemData: ResolverEcosystemData) =>
      ecosystemData.lastProcessedIpfsHash,
  },
};

export default ecosystemResolvers;
