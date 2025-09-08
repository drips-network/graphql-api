import type { LinkedIdentity as GqlLinkedIdentity } from '../generated/graphql';
import { Driver } from '../generated/graphql';
import type { LinkedIdentityDataValues } from './LinkedIdentityModel';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import { extractOrcidFromAccountId } from '../orcid-account/orcidAccountIdUtils';

export default function toGqlLinkedIdentity(
  identity: LinkedIdentityDataValues,
): GqlLinkedIdentity {
  switch (identity.identityType) {
    case 'orcid':
      return {
        account: {
          driver: Driver.REPO,
          accountId: identity.accountId,
        },
        owner: {
          driver: Driver.ADDRESS,
          accountId: identity.ownerAccountId,
          address: identity.ownerAddress,
        },
        isLinked: identity.isLinked,
        createdAt: identity.createdAt,
        updatedAt: identity.updatedAt,
        orcid: extractOrcidFromAccountId(identity.accountId),
      };
    default:
      return shouldNeverHappen(
        `Unsupported linked identity type: ${identity.identityType}`,
      );
  }
}
