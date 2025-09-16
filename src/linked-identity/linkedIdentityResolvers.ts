import type {
  LinkedIdentity,
  LinkedIdentitySortInput,
  LinkedIdentityWhereInput,
  SupportedChain,
  OrcidLinkedIdentity as GqlOrcidLinkedIdentity,
  AddressDriverAccount,
  RepoDriverAccount,
} from '../generated/graphql';
import { chainToDbSchema } from '../utils/chainSchemaMappings';
import type { Context } from '../server';
import queryableChains from '../common/queryableChains';
import toGqlLinkedIdentity from './linkedIdentityUtils';
import {
  assertIsAccountId,
  assertIsLinkedIdentityId,
  isLinkedIdentityId,
  isOrcidId,
} from '../utils/assert';
import validateOrcidExists from '../orcid-account/validateOrcidExists';
import { getCrossChainOrcidAccountIdByAddress } from '../common/dripsContracts';
import { extractOrcidFromAccountId } from '../orcid-account/orcidAccountIdUtils';
import validateLinkedIdentitiesInput from './linkedIdentityValidators';
import { validateChainsQueryArg } from '../utils/commonInputValidators';
import type { RepoDriverId } from '../common/types';
import { resolveTotalEarned } from '../common/commonResolverLogic';
import getWithdrawableBalancesOnChain from '../utils/getWithdrawableBalances';

const linkedIdentityResolvers = {
  Query: {
    linkedIdentities: async (
      _: undefined,
      args: {
        chains?: SupportedChain[];
        where?: LinkedIdentityWhereInput;
        sort?: LinkedIdentitySortInput;
        limit?: number;
      },
      { dataSources: { linkedIdentitiesDataSource } }: Context,
    ): Promise<LinkedIdentity[]> => {
      validateLinkedIdentitiesInput(args);

      const { chains, where, sort, limit } = args;

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      const dbLinkedIdentities =
        await linkedIdentitiesDataSource.getLinkedIdentitiesByFilter(
          dbSchemasToQuery,
          where,
          sort,
          limit,
        );

      return dbLinkedIdentities.map(toGqlLinkedIdentity);
    },

    linkedIdentityById: async (
      _: undefined,
      { id, chain }: { id: string; chain: SupportedChain },
      { dataSources: { linkedIdentitiesDataSource } }: Context,
    ): Promise<LinkedIdentity | null> => {
      if (!isLinkedIdentityId(id)) {
        return null;
      }

      validateChainsQueryArg([chain]);

      const identity = await linkedIdentitiesDataSource.getLinkedIdentityById(
        id,
        [chainToDbSchema[chain]],
      );

      return identity ? toGqlLinkedIdentity(identity) : null;
    },

    orcidLinkedIdentityByOrcid: async (
      _: undefined,
      { orcid, chain }: { orcid: string; chain: SupportedChain },
      { dataSources: { linkedIdentitiesDataSource } }: Context,
    ): Promise<GqlOrcidLinkedIdentity | null> => {
      if (!isOrcidId(orcid)) {
        return null;
      }

      validateChainsQueryArg([chain]);

      const exists = await validateOrcidExists(orcid);
      if (!exists) return null;

      const orcidId: RepoDriverId = await getCrossChainOrcidAccountIdByAddress(
        orcid,
        [chainToDbSchema[chain]],
      );

      assertIsLinkedIdentityId(orcidId);
      const identity = await linkedIdentitiesDataSource.getLinkedIdentityById(
        orcidId,
        [chainToDbSchema[chain]],
      );

      return identity ? toGqlLinkedIdentity(identity) : null;
    },
  },
  OrcidLinkedIdentity: {
    chain: (linkedIdentity: GqlOrcidLinkedIdentity): SupportedChain =>
      linkedIdentity.chain,
    account: (linkedIdentity: GqlOrcidLinkedIdentity): RepoDriverAccount =>
      linkedIdentity.account,
    owner: (
      linkedIdentity: GqlOrcidLinkedIdentity,
    ): AddressDriverAccount | null => linkedIdentity.owner ?? null,
    areSplitsValid: (linkedIdentity: GqlOrcidLinkedIdentity): boolean =>
      linkedIdentity.areSplitsValid,
    isClaimed: (linkedIdentity: GqlOrcidLinkedIdentity): boolean =>
      Boolean(linkedIdentity.owner),
    orcid: (linkedIdentity: GqlOrcidLinkedIdentity): string =>
      extractOrcidFromAccountId(linkedIdentity.account.accountId),
    support: (
      linkedIdentity: GqlOrcidLinkedIdentity,
      _: {},
      { dataSources: { supportDataSource } }: Context,
    ) => {
      assertIsAccountId(linkedIdentity.account.accountId);
      return supportDataSource.getAllSupportByAccountIdOnChain(
        linkedIdentity.account.accountId,
        chainToDbSchema[linkedIdentity.chain],
      );
    },
    totalEarned: (
      linkedIdentity: GqlOrcidLinkedIdentity,
      _: {},
      context: Context,
    ) => resolveTotalEarned(linkedIdentity, context),
    withdrawableBalances: (linkedIdentity: GqlOrcidLinkedIdentity) => {
      assertIsLinkedIdentityId(linkedIdentity.account.accountId);
      return getWithdrawableBalancesOnChain(
        linkedIdentity.account.accountId,
        chainToDbSchema[linkedIdentity.chain],
      );
    },
  },
};

export default linkedIdentityResolvers;
