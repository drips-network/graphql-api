import { isAddress } from 'ethers';
import { SortDirection } from '../generated/graphql';
import { isDripListId } from '../utils/assert';
import type dripListResolvers from './dripListResolvers';
import { validateChainsQueryArg } from '../utils/commonInputValidators';

function isSortableDripListField(field: string): boolean {
  return ['mintedAt'].includes(field);
}

export default function verifyDripListsInput(
  dripsListsQueryArgs: Parameters<typeof dripListResolvers.Query.dripLists>[1],
) {
  const { where, sort, chains } = dripsListsQueryArgs;

  if (where?.id && !isDripListId(where.id)) {
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
}
