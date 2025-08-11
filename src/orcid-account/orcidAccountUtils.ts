import type { LinkedIdentityDataValues } from '../linked-identity/LinkedIdentityModel';
import type {
  DbSchema,
  ResolverOrcidAccount,
  ResolverClaimedOrcidAccountData,
  ResolverUnClaimedOrcidAccountData,
} from '../common/types';
import { Driver } from '../generated/graphql';
import { dbSchemaToChain } from '../utils/chainSchemaMappings';
import getUserAddress from '../utils/getUserAddress';
import { extractOrcidFromAccountId } from './orcidAccountIdUtils';

export function toResolverOrcidAccount(
  chains: DbSchema[],
  linkedIdentity: LinkedIdentityDataValues,
): ResolverOrcidAccount {
  const chainData = chains.map((chain) => {
    const baseData = {
      chain: dbSchemaToChain[chain],
      parentOrcidAccountInfo: {
        accountId: linkedIdentity.accountId,
        accountChain: chain,
      },
    };

    if (linkedIdentity.isLinked && linkedIdentity.ownerAccountId) {
      return {
        ...baseData,
        linkedTo: {
          driver: Driver.ADDRESS,
          accountId: linkedIdentity.ownerAccountId,
          address: getUserAddress(linkedIdentity.ownerAccountId),
        },
        support: [],
        totalEarned: [],
        withdrawableBalances: [],
      } as ResolverClaimedOrcidAccountData;
    }

    return {
      ...baseData,
      linkedTo: null,
      support: [],
      withdrawableBalances: [],
    } as ResolverUnClaimedOrcidAccountData;
  });

  // Extract ORCID identifier from account ID for URL generation
  const orcidIdentifier = extractOrcidFromAccountId(linkedIdentity.accountId);

  return {
    source: {
      url: `https://orcid.org/${orcidIdentifier}`,
      forge: 'Orcid',
    },
    account: {
      driver: Driver.REPO,
      accountId: linkedIdentity.accountId,
    },
    chainData,
  };
}

export function toResolverOrcidAccounts(
  chains: DbSchema[],
  linkedIdentities: LinkedIdentityDataValues[],
): ResolverOrcidAccount[] {
  return linkedIdentities.map((identity) =>
    toResolverOrcidAccount(chains, identity),
  );
}

export function mergeOrcidAccounts(
  linkedIdentities: LinkedIdentityDataValues[],
  chains: DbSchema[],
): ResolverOrcidAccount {
  if (linkedIdentities.length === 0) {
    throw new Error('No linked identities provided for merging');
  }

  // Group identities by chain for proper merging
  const identitiesMap = new Map<DbSchema, LinkedIdentityDataValues>();
  linkedIdentities.forEach((identity) => {
    if (identity.chain) {
      identitiesMap.set(identity.chain, identity);
    }
  });

  // Use the first identity as base (for common properties like accountId, ORCID identifier)
  const baseIdentity = linkedIdentities[0];

  // Generate chain data for all requested chains
  const chainData = chains.map((chain) => {
    const identityOnChain = identitiesMap.get(chain);

    const baseData = {
      chain: dbSchemaToChain[chain],
      parentOrcidAccountInfo: {
        accountId: baseIdentity.accountId,
        accountChain: chain,
      },
    };

    if (identityOnChain?.isLinked && identityOnChain.ownerAccountId) {
      return {
        ...baseData,
        linkedTo: {
          driver: Driver.ADDRESS,
          accountId: identityOnChain.ownerAccountId,
          address: getUserAddress(identityOnChain.ownerAccountId),
        },
        support: [],
        totalEarned: [],
        withdrawableBalances: [],
      } as ResolverClaimedOrcidAccountData;
    }

    return {
      ...baseData,
      linkedTo: null,
      support: [],
      withdrawableBalances: [],
    } as ResolverUnClaimedOrcidAccountData;
  });

  // Extract ORCID identifier from account ID for URL generation
  const orcidIdentifier = extractOrcidFromAccountId(baseIdentity.accountId);

  return {
    source: {
      url: `https://orcid.org/${orcidIdentifier}`,
      forge: 'Orcid',
    },
    account: {
      driver: Driver.REPO,
      accountId: baseIdentity.accountId,
    },
    chainData,
  };
}
