import type {
  NftDriverId,
  ResolverEcosystem,
  ResolverEcosystemData,
} from '../common/types';
import type {
  AddressDriverAccount,
  NftDriverAccount,
} from '../generated/graphql';
import { SupportedChain } from '../generated/graphql';
import type { Context } from '../server';
import assert, { isNftDriverId } from '../utils/assert';
import { resolveTotalEarned } from '../common/commonResolverLogic';
import { chainToDbSchema } from '../utils/chainSchemaMappings';
import { getLatestMetadataHashOnChain } from '../utils/getLatestAccountMetadata';
import { toResolverEcosystem } from './ecosystemUtils';

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
    support: async (
      {
        parentEcosystemInfo: { ecosystemId, ecosystemChain },
      }: ResolverEcosystemData,
      _: {},
      {
        dataSources: {
          // projectsDataSource,
          // dripListsDataSource,
          supportDataSource,
        },
      }: Context,
    ) => {
      // TODO: Query split support for Ecosystem.

      // const dbRepoDriverSplitReceivers =
      //   await supportDataSource.getSplitSupportByDripListIdOnChain(
      //     dripListId,
      //     dripListChain,
      //   );

      // const projectsAndDripListsSupport = await Promise.all(
      //   dbRepoDriverSplitReceivers.map(async (receiver) => {
      //     const {
      //       funderProjectId,
      //       funderDripListId,
      //       fundeeDripListId,
      //       blockTimestamp,
      //     } = receiver;

      //     // Supported is a Project.
      //     if (funderProjectId && !funderDripListId) {
      //       return {
      //         ...receiver,
      //         account: {
      //           driver: Driver.NFT,
      //           accountId: fundeeDripListId,
      //         },
      //         date: blockTimestamp,
      //         totalSplit: [],
      //         project: await toResolverProject(
      //           [dripListChain],
      //           (await projectsDataSource.getProjectByIdOnChain(
      //             funderProjectId,
      //             dripListChain,
      //           )) || shouldNeverHappen(),
      //         ),
      //       };
      //       // Supported is a DripList.
      //     }
      //     if (funderDripListId && !funderProjectId) {
      //       return {
      //         ...receiver,
      //         account: {
      //           driver: Driver.NFT,
      //           accountId: fundeeDripListId,
      //         },
      //         date: blockTimestamp,
      //         totalSplit: [],
      //         dripList: await toResolverDripList(
      //           dripListChain,
      //           (await dripListsDataSource.getDripListById(funderDripListId, [
      //             dripListChain,
      //           ])) || shouldNeverHappen(),
      //         ),
      //       };
      //     }

      //     return shouldNeverHappen(
      //       'Supported is neither a Project nor a DripList.',
      //     );
      //   }),
      // );

      // `GivenEventModelDataValues`s that represent one time donations to the Project.
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
        // ...projectsAndDripListsSupport,
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
