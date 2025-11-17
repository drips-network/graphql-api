import { GraphQLError } from 'graphql';
import type {
  LinkedIdentity,
  LinkedIdentitySortInput,
  LinkedIdentityWhereInput,
  SupportedChain,
  OrcidLinkedIdentity as GqlOrcidLinkedIdentity,
  AddressDriverAccount,
  RepoDriverAccount,
  OrcidMetadata as GqlOrcidMetadata,
} from '../generated/graphql';
import { Driver } from '../generated/graphql';
import { chainToDbSchema } from '../utils/chainSchemaMappings';
import type { Context } from '../server';
import queryableChains from '../common/queryableChains';
import toGqlLinkedIdentity, {
  toFakeUnclaimedOrcid,
} from './linkedIdentityUtils';
import {
  assertIsLinkedIdentityId,
  isLinkedIdentityId,
  isOrcidId,
} from '../utils/assert';
import validateOrcidExists from '../orcid-account/validateOrcidExists';
import fetchOrcidProfile from '../orcid-account/orcidApi';
import { getCrossChainOrcidAccountIdByOrcidId } from '../common/dripsContracts';
import { extractOrcidFromAccountId } from '../orcid-account/orcidAccountIdUtils';
import validateLinkedIdentitiesInput from './linkedIdentityValidators';
import { validateChainsQueryArg } from '../utils/commonInputValidators';
import type { RepoDriverId } from '../common/types';
import { resolveTotalEarned } from '../common/commonResolverLogic';
import getWithdrawableBalancesOnChain from '../utils/getWithdrawableBalances';
import { PUBLIC_ERROR_CODES } from '../utils/formatError';
import { toResolverProject } from '../project/projectUtils';
import { toResolverDripList } from '../drip-list/dripListUtils';
import { toResolverEcosystems } from '../ecosystem/ecosystemUtils';

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
        throw new GraphQLError('Invalid ORCID identifier provided.', {
          extensions: { code: PUBLIC_ERROR_CODES.BadUserInput },
        });
      }

      validateChainsQueryArg([chain]);

      const exists = await validateOrcidExists(orcid);
      if (!exists) return null;

      // Try to find the account with the ORCID as provided (which may include sandbox- prefix)
      const orcidAccountId: RepoDriverId =
        await getCrossChainOrcidAccountIdByOrcidId(orcid, [
          chainToDbSchema[chain],
        ]);

      assertIsLinkedIdentityId(orcidAccountId);
      const identity = await linkedIdentitiesDataSource.getLinkedIdentityById(
        orcidAccountId,
        [chainToDbSchema[chain]],
      );

      return identity
        ? toGqlLinkedIdentity(identity)
        : toFakeUnclaimedOrcid(orcid, orcidAccountId, chain);
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
    orcidMetadata: async (
      linkedIdentity: GqlOrcidLinkedIdentity,
    ): Promise<GqlOrcidMetadata | null> => {
      const orcid = extractOrcidFromAccountId(linkedIdentity.account.accountId);
      const profile = await fetchOrcidProfile(orcid); // TODO: This could cause N+1 queries if multiple ORCID identities are resolved. Consider DataLoader pattern if that becomes an issue.
      if (!profile) return null;

      return { ...profile };
    },
    support: async (
      linkedIdentity: GqlOrcidLinkedIdentity,
      _: {},
      {
        dataSources: {
          supportDataSource,
          projectsDataSource,
          dripListsDataSource,
          ecosystemsDataSource,
        },
      }: Context,
    ) => {
      assertIsLinkedIdentityId(linkedIdentity.account.accountId);
      const chain = chainToDbSchema[linkedIdentity.chain];

      const splitReceivers =
        await supportDataSource.getSplitSupportByReceiverIdOnChain(
          linkedIdentity.account.accountId,
          chain,
        );

      const supportItems = await Promise.all(
        splitReceivers.map(async (receiver) => {
          const {
            senderAccountId,
            receiverAccountId,
            blockTimestamp,
            senderAccountType,
          } = receiver;

          if (senderAccountType === 'project') {
            const projectData = await projectsDataSource.getProjectByIdOnChain(
              senderAccountId as any,
              chain,
            );

            if (!projectData) {
              return null;
            }

            return {
              ...receiver,
              account: {
                driver: Driver.REPO,
                accountId: receiverAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              project: await toResolverProject([chain], projectData),
            };
          }

          if (senderAccountType === 'drip_list') {
            const dripListData = await dripListsDataSource.getDripListById(
              senderAccountId as any,
              [chain],
            );

            if (!dripListData) {
              return null;
            }

            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: receiverAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              dripList: await toResolverDripList(chain, dripListData),
            };
          }

          if (senderAccountType === 'ecosystem_main_account') {
            const ecosystemData = await ecosystemsDataSource.getEcosystemById(
              senderAccountId as any,
              [chain],
            );

            if (!ecosystemData) {
              return null;
            }

            const [ecosystemMainAccount] = await toResolverEcosystems(
              [chain],
              [ecosystemData],
            );

            return {
              ...receiver,
              account: {
                driver: Driver.NFT,
                accountId: receiverAccountId,
              },
              date: blockTimestamp,
              totalSplit: [],
              ecosystemMainAccount,
            };
          }

          return null;
        }),
      );

      const splitSupport = supportItems.filter((item) => item !== null);

      const oneTimeDonationSupport =
        await supportDataSource.getOneTimeDonationSupportByAccountIdOnChain(
          linkedIdentity.account.accountId,
          chain,
        );

      return [...splitSupport, ...oneTimeDonationSupport];
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
