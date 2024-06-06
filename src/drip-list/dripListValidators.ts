import { isAddress } from 'ethers';
import { isDripListId } from '../utils/assert';
import type dripListResolvers from './dripListResolvers';
import { validateChainsQueryArg } from '../utils/commonInputValidators';

export default function verifyDripListsInput(
  dripsListsQueryArgs: Parameters<typeof dripListResolvers.Query.dripLists>[1],
) {
  const { where, chains } = dripsListsQueryArgs;

  if (where?.id && !isDripListId(where.id)) {
    throw new Error('Invalid drip list id.');
  }

  if (where?.ownerAddress && !isAddress(where.ownerAddress)) {
    throw new Error('Invalid owner address.');
  }

  if (chains?.length) {
    validateChainsQueryArg(chains);
  }
}
