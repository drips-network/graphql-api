import type { AddressDriverId, DripListId, ProjectId } from '../common/types';
import { ProjectVerificationStatus } from '../generated/graphql';
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

export function isGitHubUrl(url: string): boolean {
  const githubUrlRegex = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/;

  if (!githubUrlRegex.test(url)) {
    return false;
  }

  return true;
}

export function isProjectVerificationStatus(
  status: string,
): status is ProjectVerificationStatus {
  return (
    status === ProjectVerificationStatus.Claimed ||
    status === ProjectVerificationStatus.OwnerUpdateRequested ||
    status === ProjectVerificationStatus.OwnerUpdated ||
    status === ProjectVerificationStatus.PendingMetadata ||
    status === ProjectVerificationStatus.PendingOwner ||
    status === ProjectVerificationStatus.Unclaimed
  );
}

export function isAccountId(id: string): boolean {
  return (
    isAddressDriverAccountId(id) ||
    isNftDriverAccountId(id) ||
    isRepoDiverAccountId(id)
  );
}

export function isSortableProjectField(field: string): boolean {
  return ['claimedAt'].includes(field);
}
