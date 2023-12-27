import type { AddressDriverId, DripListId, ProjectId } from '../common/types';
import getContractNameByAccountId from './getContractNameByAccountId';

export default function assert(
  condition: unknown,
  message = 'Assertion Error',
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function isAddressDriverAccountId(id: string): id is AddressDriverId {
  const isNaN = Number.isNaN(Number(id));
  const isAccountIdOfAddressDriver =
    getContractNameByAccountId(id) === 'addressDriver';

  if (isNaN || !isAccountIdOfAddressDriver) {
    return false;
  }

  return true;
}

export function assertAddressDiverId(
  id: string,
): asserts id is AddressDriverId {
  if (!isAddressDriverAccountId(id)) {
    throw new Error(`String ${id} is not a valid 'AddressDriverId'.`);
  }
}

export function isNftDriverAccountId(id: string): id is DripListId {
  const isNaN = Number.isNaN(Number(id));
  const isAccountIdOfNftDriver = getContractNameByAccountId(id) === 'nftDriver';

  if (isNaN || !isAccountIdOfNftDriver) {
    return false;
  }

  return true;
}

export function isRepoDiverAccountId(id: string): id is ProjectId {
  const isNaN = Number.isNaN(Number(id));
  const isAccountIdOfRepoDriver =
    getContractNameByAccountId(id) === 'repoDriver';

  if (isNaN || !isAccountIdOfRepoDriver) {
    return false;
  }

  return true;
}
