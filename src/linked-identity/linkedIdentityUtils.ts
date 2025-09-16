import type {
  LinkedIdentity as GqlLinkedIdentity,
  OrcidLinkedIdentity as GqlOrcidLinkedIdentity,
} from '../generated/graphql';
import { Driver } from '../generated/graphql';
import type { LinkedIdentityDataValues } from './LinkedIdentityModel';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import { extractOrcidFromAccountId } from '../orcid-account/orcidAccountIdUtils';
import { dbSchemaToChain } from '../utils/chainSchemaMappings';

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
