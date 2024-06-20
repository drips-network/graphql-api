import { isAddress } from 'ethers';
import {
  assetIncomingBalanceTimeline,
  assetOutgoingBalanceTimeline,
} from '../balances/estimate-reloaded';
import type {
  AccountId,
  Address,
  AddressDriverId,
  ResolverUser,
  ResolverUserData,
  UserDataParentDripListInfo,
} from '../common/types';
import type DripListModel from '../drip-list/DripListModel';
import type {
  SupportedChain,
  AddressDriverAccount,
  User,
} from '../generated/graphql';
import { Driver } from '../generated/graphql';
import type { Context } from '../server';
import assert, { isAddressDriverId } from '../utils/assert';
import getAssetConfigs from '../utils/getAssetConfigs';
import getUserAddress from '../utils/getUserAddress';
import queryableChains from '../common/queryableChains';
import { toResolverProject, toResolverProjects } from '../project/projectUtils';
import {
  toResolverDripList,
  toResolverDripLists,
} from '../drip-list/dripListUtils';
import getLatestAccountMetadataOnChain from '../utils/getLatestAccountMetadata';
import { validateChainsQueryArg } from '../utils/commonInputValidators';
import toResolverUser from './userUtils';
import { getCrossChainAddressDriverAccountIdByAddress } from '../common/dripsContracts';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import { chainToDbSchema } from '../utils/chainSchemaMappings';
import getWithdrawableBalancesOnChain, {
  getRelevantTokens,
} from '../utils/getWithdrawableBalances';

const userResolvers = {
  Query: {
    userById: (
      _: undefined,
      {
        accountId,
        chains,
      }: { accountId: AddressDriverId; chains?: SupportedChain[] },
    ): ResolverUser => {
      assert(isAddressDriverId(accountId));
      if (chains?.length) {
        validateChainsQueryArg(chains);
      }

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      return toResolverUser(dbSchemasToQuery, accountId);
    },
    userByAddress: async (
      _: undefined,
      { address, chains }: { address: Address; chains?: SupportedChain[] },
    ): Promise<ResolverUser> => {
      assert(isAddress(address));
      if (chains?.length) {
        validateChainsQueryArg(chains);
      }

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      const accountId =
        await getCrossChainAddressDriverAccountIdByAddress(address);

      return toResolverUser(dbSchemasToQuery, accountId);
    },
  },
  User: {
    account: (user: ResolverUser): AddressDriverAccount => user.account,
    chainData: (user: ResolverUser): ResolverUserData[] => user.chainData,
  },
  UserData: {
    streams: async ({
      parentUserInfo,
      streams: { incoming, outgoing },
    }: ResolverUserData) => ({
      incoming,
      outgoing,
      parentUserInfo,
    }),
    withdrawableBalances: async ({
      parentUserInfo: { accountId, userChain },
    }: ResolverUserData) =>
      getWithdrawableBalancesOnChain(accountId, userChain),
    balances: async (
      { parentUserInfo: { accountId, userChain } }: ResolverUserData,
      _: any,
      { dataSources: { streamsDataSource } }: Context,
    ) => {
      const chainMetadata = await getLatestAccountMetadataOnChain(
        [userChain],
        accountId as AddressDriverId,
      );

      const metadata = chainMetadata[userChain]?.metadata ?? {};

      const [assetConfigs, incomingStreams, relevantTokensForIncomingBalance] =
        await Promise.all([
          await getAssetConfigs(accountId as AddressDriverId, metadata, [
            userChain,
          ]),
          streamsDataSource.getUserIncomingStreams(
            [userChain],
            accountId as AddressDriverId,
          ),
          getRelevantTokens(accountId as AccountId, userChain),
        ]);

      const allTokens = Array.from(
        new Set([
          ...assetConfigs[userChain].map((ac) => ac.tokenAddress),
          ...relevantTokensForIncomingBalance,
        ]),
      );

      return Promise.all(
        allTokens.map(async (tokenAddress) => {
          const outgoingAssetConfig = assetConfigs[userChain].find(
            (ac) => ac.tokenAddress === tokenAddress,
          );

          return {
            tokenAddress,
            incoming: await assetIncomingBalanceTimeline(
              accountId as AccountId,
              tokenAddress,
              incomingStreams[userChain],
              userChain,
            ),
            outgoing: outgoingAssetConfig
              ? assetOutgoingBalanceTimeline(outgoingAssetConfig.history)
              : [],
          };
        }),
      );
    },
    projects: async (
      { parentUserInfo: { accountId, userChain } }: ResolverUserData,
      _: {},
      { dataSources: { projectsDataSource } }: Context,
    ) => {
      const projectDataValues = await projectsDataSource.getProjectsByFilter(
        [userChain],
        {
          ownerAddress: getUserAddress(accountId),
        },
      );

      return toResolverProjects([userChain], projectDataValues);
    },
    dripLists: async (
      { parentUserInfo: { accountId, userChain } }: ResolverUserData,
      _: {},
      { dataSources: { dripListsDataSource } }: Context,
    ) => {
      const dripListDataValues = await dripListsDataSource.getDripListsByFilter(
        [userChain],
        {
          ownerAddress: getUserAddress(accountId),
        },
      );

      return toResolverDripLists([userChain], dripListDataValues);
    },
    support: async (
      { parentUserInfo: { accountId, userChain } }: ResolverUserData,
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
      const dbAddressDriverSplitReceivers =
        await projectAndDripListSupportDataSource.getProjectAndDripListSupportByAddressDriverIdOnChain(
          accountId as AddressDriverId,
          userChain,
        );

      const projectsAndDripListsSupport = await Promise.all(
        dbAddressDriverSplitReceivers.map(async (receiver) => {
          const {
            funderProjectId,
            funderDripListId,
            fundeeAccountId,
            blockTimestamp,
          } = receiver;

          // Supported is a Project.
          if (funderProjectId && !funderDripListId) {
            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: fundeeAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              project: await toResolverProject(
                [userChain],
                (await projectsDataSource.getProjectByIdOnChain(
                  funderProjectId,
                  userChain,
                )) || shouldNeverHappen(),
              ),
            };
            // Supported is a DripList.
          }
          if (funderDripListId && !funderProjectId) {
            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: fundeeAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              dripList: await toResolverDripList(
                userChain,
                (await dripListsDataSource.getDripListById(funderDripListId, [
                  userChain,
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
        await projectAndDripListSupportDataSource.getOneTimeDonationSupportByAccountIdOnChain(
          accountId as AccountId,
          userChain,
        );

      const streamSupport =
        await projectAndDripListSupportDataSource.getStreamSupportByAccountIdOnChain(
          accountId as AccountId,
          userChain,
        );

      return [
        ...projectsAndDripListsSupport,
        ...streamSupport,
        ...oneTimeDonationSupport,
      ];
    },
    latestMetadataIpfsHash: async ({
      parentUserInfo: { accountId, userChain },
    }: ResolverUserData) => {
      const chainMetadata = await getLatestAccountMetadataOnChain(
        [userChain],
        accountId as AddressDriverId,
      );

      return chainMetadata[userChain]?.ipfsHash;
    },
  },
  UserStreams: {
    outgoing: async (
      { parentUserInfo }: UserDataParentDripListInfo,
      _: {},
      { dataSources: { streamsDataSource } }: Context,
    ) => {
      const { accountId, userChain } = parentUserInfo;
      assert(isAddressDriverId(accountId));

      return (
        await streamsDataSource.getUserOutgoingStreams([userChain], accountId)
      )[userChain];
    },
    incoming: async (
      { parentUserInfo }: UserDataParentDripListInfo,
      _: {},
      { dataSources: { streamsDataSource } }: Context,
    ) => {
      const { accountId, userChain } = parentUserInfo;
      assert(isAddressDriverId(accountId));

      return (
        await streamsDataSource.getUserIncomingStreams([userChain], accountId)
      )[userChain];
    },
  },
  StreamReceiver: {
    __resolveType(parent: DripListModel | User) {
      if ('account' in parent && parent.account.driver === Driver.NFT) {
        return 'DripList';
      }

      return 'User';
    },
  },
};

export default userResolvers;
