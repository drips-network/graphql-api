/* eslint-disable no-bitwise */

import type {
  RepoDriverId,
  NftDriverId,
  AddressDriverId,
  ImmutableSplitsDriverId,
  AccountId,
  RepoSubAccountDriverId,
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

export function assertIsAddressDiverId(
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

/**
 * Validates an ORCID iD.
 *
 * An ORCID iD is a 16-character string that follows a specific structure:
 * - It consists of 15 digits followed by a check digit (0-9 or 'X').
 * - It is often formatted with hyphens, e.g., "0000-0002-1825-0097".
 * - The validation uses the ISO 7064 11,2 checksum algorithm.
 *
 * @param {string} orcid The ORCID iD string to validate.
 * @returns {boolean} True if the ORCID iD is valid, false otherwise.
 */
export function isOrcidId(orcidId: string): boolean {
  if (typeof orcidId !== 'string') {
    return false;
  }

  // Remove hyphens and whitespace to get the base 16 characters.
  const baseStr: string = orcidId.replace(/[-\s]/g, '');

  // An ORCID must be 16 characters long and match the pattern:
  // 15 digits followed by a final character that is a digit or 'X'.
  const orcidPattern: RegExp = /^\d{15}[\dX]$/;
  if (!orcidPattern.test(baseStr.toUpperCase())) {
    return false;
  }

  // --- Checksum Calculation (ISO 7064 11,2) ---

  let total: number = 0;
  // Iterate over the first 15 digits of the ORCID.
  for (let i = 0; i < 15; i++) {
    const digit: number = parseInt(baseStr[i], 10);
    total = (total + digit) * 2;
  }

  // Calculate the remainder when divided by 11.
  const remainder: number = total % 11;
  // Subtract the remainder from 12.
  const result: number = (12 - remainder) % 11;

  // Determine the correct check digit from the result.
  // If the result is 10, the check digit is 'X'. Otherwise, it's the digit itself.
  const calculatedCheckDigit: string = result === 10 ? 'X' : String(result);

  // Get the actual check digit from the input string.
  const actualCheckDigit: string = baseStr.charAt(15).toUpperCase();

  // Compare the calculated check digit with the actual one.
  return calculatedCheckDigit === actualCheckDigit;
}
