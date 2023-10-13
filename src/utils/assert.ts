import type {
  AddressAccountId,
  DripListAccountId,
  ProjectAccountId,
} from '../common/types';
import getContractNameByAccountId from './getContractNameByAccountId';

export function isAddressDriverAccountId(id: string): id is AddressAccountId {
  const isNaN = Number.isNaN(Number(id));
  const isAccountIdOfAddressDriver =
    getContractNameByAccountId(id) === 'addressDriver';

  if (isNaN || !isAccountIdOfAddressDriver) {
    return false;
  }

  return true;
}

export function isNftDriverAccountId(id: string): id is DripListAccountId {
  const isNaN = Number.isNaN(Number(id));
  const isAccountIdOfNftDriver = getContractNameByAccountId(id) === 'nftDriver';

  if (isNaN || !isAccountIdOfNftDriver) {
    return false;
  }

  return true;
}

export function isRepoDiverAccountId(id: string): id is ProjectAccountId {
  const isNaN = Number.isNaN(Number(id));
  const isAccountIdOfRepoDriver =
    getContractNameByAccountId(id) === 'repoDriver';

  if (isNaN || !isAccountIdOfRepoDriver) {
    return false;
  }

  return true;
}
