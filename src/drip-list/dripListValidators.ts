import { isAddress } from 'ethers';
import { isNftDriverId } from '../utils/assert';
import { SortDirection } from '../generated/graphql';
import type dripListResolvers from './dripListResolvers';
import { validateChainsQueryArg } from '../utils/commonInputValidators';

function isSortableDripListField(field: string): boolean {
  return ['mintedAt'].includes(field);
}

export default function verifyDripListsInput(
  dripsListsQueryArgs: Parameters<typeof dripListResolvers.Query.dripLists>[1],
) {
  const { where, sort, chains, limit } = dripsListsQueryArgs;

  if (where?.accountId && !isNftDriverId(where.accountId)) {
    throw new Error('Invalid drip list id.');
  }

  if (where?.ownerAddress && !isAddress(where.ownerAddress)) {
    throw new Error('Invalid owner address.');
  }

  if (sort?.field && !isSortableDripListField(sort.field)) {
    throw new Error('Invalid sort field.');
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
