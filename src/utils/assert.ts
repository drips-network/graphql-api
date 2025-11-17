/* eslint-disable no-bitwise */

import type {
  RepoDriverId,
  NftDriverId,
  AddressDriverId,
  ImmutableSplitsDriverId,
  AccountId,
  RepoSubAccountDriverId,
  LinkedIdentityId,
} from '../common/types';
import { ProjectVerificationStatus } from '../generated/graphql';

export default function assert(
  condition: unknown,
  message = 'Assertion Error',
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
export function assertMany<T>(
  array: T[],
  validationFn: ((item: T) => boolean) | ((item: T) => asserts item is any),
  message?: string,
): void {
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    try {
      validationFn(item);
    } catch (error: unknown) {
      throw new Error(
        message ||
          `Failed to assert: item at index ${i} (${item}) is not valid. ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}

export function getContractNameFromAccountId(id: string) {
  if (Number.isNaN(Number(id))) {
    throw new Error(`Could not get bits: ${id} is not a number.`);
  }

  const accountIdAsBigInt = BigInt(id);

  if (accountIdAsBigInt < 0n || accountIdAsBigInt > 2n ** 256n - 1n) {
    throw new Error(
      `Could not get bits: ${id} is not a valid positive number within the range of a uint256.`,
    );
  }

  const mask = 2n ** 32n - 1n; // 32 bits mask

  const bits = (accountIdAsBigInt >> 224n) & mask; // eslint-disable-line no-bitwise

  switch (bits) {
    case 0n:
      return 'addressDriver';
    case 1n:
      return 'nftDriver';
    case 2n:
      return 'immutableSplitsDriver';
    case 3n:
      return 'repoDriver';
    case 4n:
      return 'repoSubAccountDriver';
    default:
      throw new Error(`Unknown driver for ID ${id}.`);
  }
}

// RepoDriver
export function isRepoDriverId(id: string | bigint): id is RepoDriverId {
  const idStr = typeof id === 'bigint' ? id.toString() : id;
  const isNaN = Number.isNaN(Number(idStr));
  const isAccountIdOfRepoDriver =
    getContractNameFromAccountId(idStr) === 'repoDriver';

  if (isNaN || !isAccountIdOfRepoDriver) {
    return false;
  }

  return true;
}

export function convertToRepoDriverId(id: bigint | string): RepoDriverId {
  const repoDriverId = typeof id === 'bigint' ? id.toString() : id;

  if (!isRepoDriverId(repoDriverId)) {
    throw new Error(`Failed to convert: '${id}' is not a valid RepoDriver ID.`);
  }

  return repoDriverId as RepoDriverId;
}

export function assertIsRepoDriverId(id: string): asserts id is RepoDriverId {
  if (!isRepoDriverId(id)) {
    throw new Error(`Failed to assert: '${id}' is not a valid RepoDriver ID.`);
  }
}

// NftDriver
export function isNftDriverId(id: string | bigint): id is NftDriverId {
  const idStr = typeof id === 'bigint' ? id.toString() : id;
  const isNaN = Number.isNaN(Number(idStr));
  const isAccountIdOfNftDriver =
    getContractNameFromAccountId(idStr) === 'nftDriver';

  if (isNaN || !isAccountIdOfNftDriver) {
    return false;
  }

  return true;
}

export function convertToNftDriverId(id: bigint | string): NftDriverId {
  const nftDriverId = typeof id === 'bigint' ? id.toString() : id;

  if (!isNftDriverId(nftDriverId)) {
    throw new Error(`Failed to convert: '${id}' is not a valid NftDriver ID.`);
  }

  return nftDriverId as NftDriverId;
}

export function assertIsNftDriverId(id: string): asserts id is NftDriverId {
  if (!isNftDriverId(id)) {
    throw new Error(`Failed to assert: '${id}' is not a valid NftDriver ID.`);
  }
}

// RepoSubAccountDriver
export function isRepoSubAccountDriverId(
  id: string | bigint,
): id is RepoSubAccountDriverId {
  const idString = typeof id === 'bigint' ? id.toString() : id;
  const isNaN = Number.isNaN(Number(idString));
  const isAccountIdOfRepoSubAccountDriver =
    getContractNameFromAccountId(idString) === 'repoSubAccountDriver';

  if (isNaN || !isAccountIdOfRepoSubAccountDriver) {
    return false;
  }

  return true;
}

export function assertIsRepoSubAccountDriverId(
  id: string,
): asserts id is RepoSubAccountDriverId {
  if (!isRepoSubAccountDriverId(id)) {
    throw new Error(
      `Failed to assert: '${id}' is not a valid RepoSubAccountDriverId ID.`,
    );
  }
}

// AddressDriver
export function isAddressDriverId(
  idString: string,
): idString is AddressDriverId {
  const isNaN = Number.isNaN(Number(idString));

  const isAccountIdOfAddressDriver =
    getContractNameFromAccountId(idString) === 'addressDriver';

  if (isNaN || !isAccountIdOfAddressDriver) {
    return false;
  }

  return true;
}

export function convertToAddressDriverId(id: string): AddressDriverId {
  if (!isAddressDriverId(id)) {
    throw new Error(
      `Failed to convert: '${id}' is not a valid AddressDriver ID.`,
    );
  }

  return id as AddressDriverId;
}

export function assertIsAddressDriverId(
  id: string,
): asserts id is AddressDriverId {
  if (!isAddressDriverId(id)) {
    throw new Error(
      `Failed to assert: '${id}' is not a valid AddressDriver ID.`,
    );
  }
}

// ImmutableSplitsDriver
export function isImmutableSplitsDriverId(
  id: string | bigint,
): id is ImmutableSplitsDriverId {
  const idString = typeof id === 'bigint' ? id.toString() : id;
  const isNaN = Number.isNaN(Number(idString));
  const immutableSplitsDriverId =
    getContractNameFromAccountId(idString) === 'immutableSplitsDriver';

  if (isNaN || !immutableSplitsDriverId) {
    return false;
  }

  return true;
}

export function convertToImmutableSplitsDriverId(
  id: string | bigint,
): ImmutableSplitsDriverId {
  const stringId = typeof id === 'bigint' ? id.toString() : id;

  if (!isImmutableSplitsDriverId(stringId)) {
    throw new Error(
      `Failed to convert: '${id}' is not a valid ImmutableSplitsDriver ID.`,
    );
  }

  return stringId as ImmutableSplitsDriverId;
}

export function assertIsImmutableSplitsDriverId(
  id: string,
): asserts id is ImmutableSplitsDriverId {
  if (!isImmutableSplitsDriverId(id)) {
    throw new Error(
      `Failed to assert: '${id}' is not a valid ImmutableSplitsDriver ID.`,
    );
  }
}

// Account ID
export function convertToAccountId(id: bigint | string): AccountId {
  const accountIdAsString = typeof id === 'bigint' ? id.toString() : id;

  if (
    isRepoDriverId(accountIdAsString) ||
    isNftDriverId(accountIdAsString) ||
    isAddressDriverId(accountIdAsString) ||
    isImmutableSplitsDriverId(accountIdAsString)
  ) {
    return accountIdAsString as AccountId;
  }

  throw new Error(`Failed to convert: '${id}' is not a valid account ID.`);
}

export function assertIsAccountId(
  id: string | bigint,
): asserts id is AccountId {
  const accountId = typeof id === 'bigint' ? id.toString() : id;

  if (
    !isRepoDriverId(accountId) &&
    !isNftDriverId(accountId) &&
    !isAddressDriverId(accountId) &&
    !isImmutableSplitsDriverId(accountId)
  ) {
    throw new Error(
      `Failed to assert: '${accountId}' is not a valid account ID.`,
    );
  }
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
    status === ProjectVerificationStatus.PendingMetadata ||
    status === ProjectVerificationStatus.Unclaimed
  );
}

export function isAccountId(id: string): boolean {
  return (
    isAddressDriverId(id) ||
    isNftDriverId(id) ||
    isRepoDriverId(id) ||
    isImmutableSplitsDriverId(id)
  );
}

// Linked Identity
export function isLinkedIdentityId(id: string): id is LinkedIdentityId {
  if (!isRepoDriverId(id)) {
    return false;
  }

  return true;
}

export function assertIsLinkedIdentityId(
  id: string,
): asserts id is LinkedIdentityId {
  if (!isLinkedIdentityId(id)) {
    throw new Error(
      `Failed to assert: '${id}' is not a valid LinkedIdentity ID.`,
    );
  }
}

/**
 * ORCID iDs in the sandbox environment should start with this prefix.
 */
export const ORCID_SANDBOX_PREFIX = 'sandbox-';

/**
 * Regex to match the sandbox prefix at the start of an ORCID iD.
 */
const ORCID_SANDBOX_PREFIX_REGEX = new RegExp(`^${ORCID_SANDBOX_PREFIX}`);

/**
 * Removes the sandbox prefix from an ORCID iD, if present.
 *
 * @param orcidId An ORCID iD, possibly with the sandbox prefix.
 * @returns The ORCID iD without the sandbox prefix.
 */
export function unprefixOrcidId(orcidId: string): string {
  return orcidId.replace(ORCID_SANDBOX_PREFIX_REGEX, '');
}

/**
 * Determine if a given string is a valid ORCID iD. ORCID iDs can be
 * prefixed with "sandbox-".
 *
 * @param orcidId An ORCID iD
 * @returns true if the ORCID iD is valid, false otherwise.
 */
export function isOrcidId(orcidId: string): boolean {
  if (typeof orcidId !== 'string') {
    return false;
  }

  const unprefixedOrcidId = unprefixOrcidId(orcidId);
  const baseStr: string = unprefixedOrcidId.replace(/[-\s]/g, '');

  const orcidPattern: RegExp = /^\d{15}[\dX]$/;
  if (!orcidPattern.test(baseStr.toUpperCase())) {
    return false;
  }

  let total: number = 0;
  for (let i = 0; i < 15; i++) {
    const digit: number = parseInt(baseStr[i], 10);
    total = (total + digit) * 2;
  }

  const remainder: number = total % 11;
  const result: number = (12 - remainder) % 11;

  const calculatedCheckDigit: string = result === 10 ? 'X' : String(result);

  const actualCheckDigit: string = baseStr.charAt(15).toUpperCase();

  return calculatedCheckDigit === actualCheckDigit;
}
