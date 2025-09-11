import { isAddress } from 'ethers';
import { SortDirection } from '../generated/graphql';
import { isLinkedIdentityId } from '../utils/assert';
import type linkedIdentityResolvers from './linkedIdentityResolvers';
import { validateChainsQueryArg } from '../utils/commonInputValidators';

export const linkedIdentitySortFields = ['createdAt'] as const;
function isSortableLinkedIdentityField(field: string): boolean {
  return linkedIdentitySortFields.includes(
    field as (typeof linkedIdentitySortFields)[number],
  );
}

export default function validateLinkedIdentitiesInput(
  linkedIdentitiesQueryArgs: Parameters<
    typeof linkedIdentityResolvers.Query.linkedIdentities
  >[1],
) {
  const { sort, limit, chains, where } = linkedIdentitiesQueryArgs;

  if (where?.accountId && !isLinkedIdentityId(where.accountId)) {
    throw new Error('Invalid linked identity account ID.');
  }

  if (where?.ownerAddress && !isAddress(where.ownerAddress)) {
    throw new Error('Invalid linked identity owner address.');
  }

  if (sort?.field && !isSortableLinkedIdentityField(sort.field)) {
    throw new Error(
      `Invalid sort field: ${sort.field}. Valid fields are: ${linkedIdentitySortFields.join(', ')}`,
    );
  }

  if (
    sort?.direction &&
    !Object.values(SortDirection).includes(sort.direction)
  ) {
    throw new Error('Invalid sort direction.');
  }

  if (chains?.length) {
    validateChainsQueryArg(chains);
  }

  if (limit) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error('Limit must be a positive integer.');
    }
    if (limit > 1000) {
      throw new Error('Limit cannot exceed 1000.');
    }
  }
}
