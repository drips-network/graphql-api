import type {
  LinkedIdentity as GqlLinkedIdentity,
  OrcidLinkedIdentity as GqlOrcidLinkedIdentity,
  SupportedChain,
} from '../generated/graphql';
import { Driver } from '../generated/graphql';
import type { LinkedIdentityDataValues } from './LinkedIdentityModel';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import { extractOrcidFromAccountId } from '../orcid-account/orcidAccountIdUtils';
import { dbSchemaToChain } from '../utils/chainSchemaMappings';
import type { RepoDriverId } from '../common/types';

export default function toGqlLinkedIdentity(
  identity: LinkedIdentityDataValues,
): GqlLinkedIdentity {
  switch (identity.identityType) {
    case 'orcid':
      return {
        chain: dbSchemaToChain[identity.chain],
        account: {
          driver: Driver.REPO,
          accountId: identity.accountId,
        },
        owner:
          identity.ownerAccountId && identity.ownerAddress
            ? {
                driver: Driver.ADDRESS,
                accountId: identity.ownerAccountId,
                address: identity.ownerAddress,
              }
            : null,
        areSplitsValid: Boolean(identity.areSplitsValid),
        isClaimed: Boolean(identity.ownerAccountId && identity.ownerAddress),
        orcid: extractOrcidFromAccountId(identity.accountId),
        support: [],
        totalEarned: [],
        withdrawableBalances: [],
      } as GqlOrcidLinkedIdentity;
    default:
      return shouldNeverHappen(
        `Unsupported linked identity type: ${identity.identityType}`,
      );
  }
}

export function toFakeUnclaimedOrcid(
  orcid: string,
  orcidAccountId: RepoDriverId,
  chain: SupportedChain,
): GqlOrcidLinkedIdentity {
  return {
    chain,
    account: {
      driver: Driver.REPO,
      accountId: orcidAccountId,
    },
    owner: null,
    areSplitsValid: true,
    isClaimed: false,
    orcid,
    support: [],
    totalEarned: [],
    withdrawableBalances: [],
  };
}
