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
import { isOrcidId } from '../utils/assert';

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
      { dataSources: { supportDataSource } }: Context,
    ) =>
      supportDataSource.getAllSupportByAccountIdOnChain(
        accountId,
        accountChain,
      ),
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
      { dataSources: { supportDataSource } }: Context,
    ) =>
      supportDataSource.getAllSupportByAccountIdOnChain(
        accountId,
        accountChain,
      ),
    withdrawableBalances: async ({
      parentOrcidAccountInfo: { accountId, accountChain },
    }: ResolverUnClaimedOrcidAccountData) =>
      getWithdrawableBalancesOnChain(accountId, accountChain),
  },
};

export default orcidAccountResolvers;
