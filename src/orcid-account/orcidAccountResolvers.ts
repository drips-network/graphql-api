import type {
  ResolverClaimedOrcidAccountData,
  ResolverOrcidAccount,
  ResolverUnClaimedOrcidAccountData,
} from '../common/types';
import {
  mergeOrcidAccounts,
  toResolverOrcidAccounts,
} from './orcidAccountUtils';
import type {
  OrcidAccountWhereInput,
  OrcidAccountSortInput,
  SupportedChain,
  OrcidAccountData,
} from '../generated/graphql';
import type { Context } from '../server';
import queryableChains from '../common/queryableChains';
import validateOrcidAccountsInput from './orcidAccountValidators';
import { resolveTotalEarned } from '../common/commonResolverLogic';
import { validateChainsQueryArg } from '../utils/commonInputValidators';
import { chainToDbSchema } from '../utils/chainSchemaMappings';
import getWithdrawableBalancesOnChain from '../utils/getWithdrawableBalances';
import {
  assertIsImmutableSplitsDriverId,
  assertIsNftDriverId,
  assertIsRepoDriverId,
  isOrcidId,
} from '../utils/assert';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import getUserAddress from '../utils/getUserAddress';
import { toResolverProject } from '../project/projectUtils';
import { toResolverDripList } from '../drip-list/dripListUtils';
import { toResolverSubList } from '../sub-list/subListUtils';
import { toResolverEcosystem } from '../ecosystem/ecosystemUtils';
import { Driver } from '../generated/graphql';
import validateOrcidExists from './validateOrcidExists';
import { getCrossChainOrcidAccountIdByAddress } from '../common/dripsContracts';

const orcidAccountResolvers = {
  Query: {
    orcidAccounts: async (
      _: undefined,
      args: {
        chains: SupportedChain[];
        where?: OrcidAccountWhereInput;
        sort?: OrcidAccountSortInput;
        limit?: number;
      },
      { dataSources: { linkedIdentitiesDataSource } }: Context,
    ): Promise<ResolverOrcidAccount[]> => {
      validateOrcidAccountsInput(args);

      const { chains, where, sort, limit } = args;

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      const dbLinkedIdentities =
        await linkedIdentitiesDataSource.getOrcidAccountsByFilter(
          dbSchemasToQuery,
          where,
          sort,
          limit,
        );

      return toResolverOrcidAccounts(dbSchemasToQuery, dbLinkedIdentities);
    },
    orcidAccountById: async (
      _: undefined,
      { id, chains }: { id: string; chains?: SupportedChain[] },
      { dataSources: { linkedIdentitiesDataSource } }: Context,
    ): Promise<ResolverOrcidAccount | null> => {
      if (!isOrcidId(id)) {
        throw new Error(
          `Invalid ORCID identifier: '${id}'. Expected format: 0000-0000-0000-000X`,
        );
      }

      if (chains?.length) {
        validateChainsQueryArg(chains);
      }

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      const exists = await validateOrcidExists(id);
      if (!exists) {
        return null;
      }

      const repoDriverId = await getCrossChainOrcidAccountIdByAddress(
        id,
        dbSchemasToQuery,
      );

      const dbLinkedIdentities =
        await linkedIdentitiesDataSource.getOrcidAccountById(
          repoDriverId,
          dbSchemasToQuery,
        );

      return dbLinkedIdentities
        ? mergeOrcidAccounts(dbLinkedIdentities, dbSchemasToQuery)
        : null;
    },
  },
  OrcidAccount: {
    source: (orcidAccount: ResolverOrcidAccount) => orcidAccount.source,
    account: (orcidAccount: ResolverOrcidAccount) => orcidAccount.account,
    chainData: (orcidAccount: ResolverOrcidAccount): OrcidAccountData[] =>
      orcidAccount.chainData,
  },
  OrcidAccountData: {
    __resolveType(parent: OrcidAccountData) {
      if ('linkedTo' in parent && parent.linkedTo !== null) {
        return 'ClaimedOrcidAccountData';
      }

      return 'UnClaimedOrcidAccountData';
    },
  },
  ClaimedOrcidAccountData: {
    chain: (orcidAccountData: ResolverClaimedOrcidAccountData) =>
      orcidAccountData.chain,
    linkedTo: (orcidAccountData: ResolverClaimedOrcidAccountData) =>
      orcidAccountData.linkedTo,
    support: async (
      {
        parentOrcidAccountInfo: { accountId, accountChain },
      }: ResolverClaimedOrcidAccountData,
      _: {},
      {
        dataSources: {
          projectsDataSource,
          dripListsDataSource,
          supportDataSource,
          ecosystemsDataSource,
          linkedIdentitiesDataSource,
          subListsDataSource,
        },
      }: Context,
    ) => {
      const splitReceivers =
        await supportDataSource.getSplitSupportByReceiverIdOnChain(
          accountId,
          accountChain,
        );

      const support = await Promise.all(
        splitReceivers.map(async (receiver) => {
          const { senderAccountId, blockTimestamp, senderAccountType } =
            receiver;

          if (senderAccountType === 'project') {
            assertIsRepoDriverId(senderAccountId);

            return {
              ...receiver,
              account: {
                driver: Driver.REPO,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              project: await toResolverProject(
                [accountChain],
                (await projectsDataSource.getProjectByIdOnChain(
                  senderAccountId,
                  accountChain,
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
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              dripList: await toResolverDripList(
                accountChain,
                (await dripListsDataSource.getDripListById(senderAccountId, [
                  accountChain,
                ])) || shouldNeverHappen(),
              ),
            };
          }

          if (senderAccountType === 'ecosystem_main_account') {
            assertIsNftDriverId(senderAccountId);

            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              ecosystemMainAccount: await toResolverEcosystem(
                accountChain,
                (await ecosystemsDataSource.getEcosystemById(senderAccountId, [
                  accountChain,
                ])) || shouldNeverHappen(),
              ),
            };
          }

          if (senderAccountType === 'linked_identity') {
            assertIsRepoDriverId(senderAccountId);

            const linkedIdentity =
              await linkedIdentitiesDataSource.getLinkedIdentityById(
                [accountChain],
                senderAccountId,
              );

            if (!linkedIdentity) {
              return shouldNeverHappen(
                `Expected LinkedIdentity ${senderAccountId} to exist.`,
              );
            }

            return {
              ...receiver,
              account: {
                driver: Driver.REPO,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              linkedIdentity: {
                account: {
                  driver: Driver.REPO,
                  accountId: linkedIdentity.accountId,
                },
                identityType: linkedIdentity.identityType,
                owner: {
                  driver: Driver.ADDRESS,
                  accountId: linkedIdentity.ownerAccountId,
                  address: getUserAddress(linkedIdentity.ownerAccountId),
                },
                isLinked: linkedIdentity.isLinked,
                createdAt: linkedIdentity.createdAt,
                updatedAt: linkedIdentity.updatedAt,
              },
            };
          }

          if (senderAccountType === 'sub_list') {
            assertIsImmutableSplitsDriverId(senderAccountId);

            const subList = (
              await subListsDataSource.getSubListsByIdsOnChain(
                [senderAccountId],
                accountChain,
              )
            )[0];

            if (!subList) {
              return shouldNeverHappen(
                `Expected SubList ${senderAccountId} to exist.`,
              );
            }

            return {
              ...receiver,
              account: {
                driver: Driver.IMMUTABLE_SPLITS,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              subList: await toResolverSubList(accountChain, subList),
            };
          }

          return shouldNeverHappen(
            'Supporter is not a supported account type.',
          );
        }),
      );

      const oneTimeDonationSupport =
        await supportDataSource.getOneTimeDonationSupportByAccountIdOnChain(
          accountId,
          accountChain,
        );

      return [...support, ...oneTimeDonationSupport];
    },
    totalEarned: async (
      orcidAccountData: ResolverClaimedOrcidAccountData,
      _: {},
      context: Context,
    ) => resolveTotalEarned(orcidAccountData, context),
    withdrawableBalances: async ({
      parentOrcidAccountInfo: { accountId, accountChain },
    }: ResolverClaimedOrcidAccountData) =>
      getWithdrawableBalancesOnChain(accountId, accountChain),
  },
  UnClaimedOrcidAccountData: {
    chain: (orcidAccountData: ResolverUnClaimedOrcidAccountData) =>
      orcidAccountData.chain,
    linkedTo: (orcidAccountData: ResolverUnClaimedOrcidAccountData) =>
      orcidAccountData.linkedTo,
    support: async (
      {
        parentOrcidAccountInfo: { accountId, accountChain },
      }: ResolverUnClaimedOrcidAccountData,
      _: {},
      {
        dataSources: {
          projectsDataSource,
          dripListsDataSource,
          supportDataSource,
          ecosystemsDataSource,
          linkedIdentitiesDataSource,
          subListsDataSource,
        },
      }: Context,
    ) => {
      const splitReceivers =
        await supportDataSource.getSplitSupportByReceiverIdOnChain(
          accountId,
          accountChain,
        );

      const support = await Promise.all(
        splitReceivers.map(async (receiver) => {
          const { senderAccountId, blockTimestamp, senderAccountType } =
            receiver;

          if (senderAccountType === 'project') {
            assertIsRepoDriverId(senderAccountId);

            return {
              ...receiver,
              account: {
                driver: Driver.REPO,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              project: await toResolverProject(
                [accountChain],
                (await projectsDataSource.getProjectByIdOnChain(
                  senderAccountId,
                  accountChain,
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
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              dripList: await toResolverDripList(
                accountChain,
                (await dripListsDataSource.getDripListById(senderAccountId, [
                  accountChain,
                ])) || shouldNeverHappen(),
              ),
            };
          }

          if (senderAccountType === 'ecosystem_main_account') {
            assertIsNftDriverId(senderAccountId);

            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              ecosystemMainAccount: await toResolverEcosystem(
                accountChain,
                (await ecosystemsDataSource.getEcosystemById(senderAccountId, [
                  accountChain,
                ])) || shouldNeverHappen(),
              ),
            };
          }

          if (senderAccountType === 'linked_identity') {
            assertIsRepoDriverId(senderAccountId);

            const linkedIdentity =
              await linkedIdentitiesDataSource.getLinkedIdentityById(
                [accountChain],
                senderAccountId,
              );

            if (!linkedIdentity) {
              return shouldNeverHappen(
                `Expected LinkedIdentity ${senderAccountId} to exist.`,
              );
            }

            return {
              ...receiver,
              account: {
                driver: Driver.REPO,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              linkedIdentity: {
                account: {
                  driver: Driver.REPO,
                  accountId: linkedIdentity.accountId,
                },
                identityType: linkedIdentity.identityType,
                owner: {
                  driver: Driver.ADDRESS,
                  accountId: linkedIdentity.ownerAccountId,
                  address: getUserAddress(linkedIdentity.ownerAccountId),
                },
                isLinked: linkedIdentity.isLinked,
                createdAt: linkedIdentity.createdAt,
                updatedAt: linkedIdentity.updatedAt,
              },
            };
          }

          if (senderAccountType === 'sub_list') {
            assertIsImmutableSplitsDriverId(senderAccountId);

            const subList = (
              await subListsDataSource.getSubListsByIdsOnChain(
                [senderAccountId],
                accountChain,
              )
            )[0];

            if (!subList) {
              return shouldNeverHappen(
                `Expected SubList ${senderAccountId} to exist.`,
              );
            }

            return {
              ...receiver,
              account: {
                driver: Driver.IMMUTABLE_SPLITS,
                accountId: senderAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              subList: await toResolverSubList(accountChain, subList),
            };
          }

          return shouldNeverHappen(
            'Supporter is not a supported account type.',
          );
        }),
      );

      const oneTimeDonationSupport =
        await supportDataSource.getOneTimeDonationSupportByAccountIdOnChain(
          accountId,
          accountChain,
        );

      return [...support, ...oneTimeDonationSupport];
    },
    withdrawableBalances: async ({
      parentOrcidAccountInfo: { accountId, accountChain },
    }: ResolverUnClaimedOrcidAccountData) =>
      getWithdrawableBalancesOnChain(accountId, accountChain),
  },
};

export default orcidAccountResolvers;
