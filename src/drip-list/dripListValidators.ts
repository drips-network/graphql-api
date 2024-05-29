import { isAddress } from 'ethers';
import { SupportedChain } from '../generated/graphql';
import type { DripListWhereInput } from '../generated/graphql';
import assert, { isDripListId } from '../utils/assert';

export default function verifyDripListsInput(input: {
  chains: SupportedChain[];
  where: DripListWhereInput;
}) {
  const { where, chains } = input;

  if (where?.id) {
    assert(isDripListId(where.id));
  }
  if (where?.ownerAddress) {
    assert(isAddress(where.ownerAddress));
  }

  if (chains) {
    chains.forEach((chain) => {
      assert(chain in SupportedChain);
    });
  }
}
