import type {
  AddressDriverAccountId,
  NftDriverAccountId,
  RepoDriverAccountId,
} from '../common/types';
import getContractNameByAccountId from './getContractNameByAccountId';

export function isAddressDriverAccountId(
  id: string,
): id is AddressDriverAccountId {
  const isNaN = Number.isNaN(Number(id));
  const isAccountIdOfAddressDriver =
    getContractNameByAccountId(id) === 'addressDriver';

  if (isNaN || !isAccountIdOfAddressDriver) {
    return false;
  }

  return true;
}

export function isNftDriverAccountId(id: string): id is NftDriverAccountId {
  const isNaN = Number.isNaN(Number(id));
  const isAccountIdOfNftDriver = getContractNameByAccountId(id) === 'nftDriver';

  if (isNaN || !isAccountIdOfNftDriver) {
    return false;
  }

  return true;
}

export function isRepoDiverAccountId(id: string): id is RepoDriverAccountId {
  const isNaN = Number.isNaN(Number(id));
  const isAccountIdOfRepoDriver =
    getContractNameByAccountId(id) === 'repoDriver';

  if (isNaN || !isAccountIdOfRepoDriver) {
    return false;
  }

  return true;
}
