/* eslint-disable no-bitwise */

import { isRepoDriverId } from '../utils/assert';

/**
 * Source IDs for ORCID in the contract.
 * - 2: regular ORCID
 * - 4: sandbox ORCID (Lit oracle uses a separate sourceId instead of a name prefix)
 */
export const ORCID_SOURCE_IDS = [2, 4];

/**
 * Extracts the sourceId from a RepoDriver account ID.
 *
 * Account ID layout: `driverId (32 bits) | sourceId (7 bits) | isHash (1 bit) | nameEncoded (216 bits)`
 *
 * The 8 bits at positions 216-223 encode `sourceId (7 bits) | isHash (1 bit)`.
 * We shift right by 1 to drop the isHash bit and get the pure sourceId.
 */
function extractSourceIdFromAccountId(accountId: string): number {
  if (!isRepoDriverId(accountId)) {
    throw new Error(
      `Cannot extract sourceId: '${accountId}' is not a RepoDriver ID.`,
    );
  }

  const accountIdAsBigInt = BigInt(accountId);
  const sourceIdAndHash = (accountIdAsBigInt >> 216n) & 0xffn;
  return Number(sourceIdAndHash >> 1n);
}

export function isOrcidAccount(accountId: string): boolean {
  try {
    return (
      isRepoDriverId(accountId) &&
      ORCID_SOURCE_IDS.includes(extractSourceIdFromAccountId(accountId))
    );
  } catch {
    return false;
  }
}

/**
 * Extracts the ORCID identifier from a RepoDriver account ID.
 * @param accountId The RepoDriver account ID representing an ORCID account
 * @returns The ORCID identifier (e.g., "0009-0001-4272-298X")
 */
export function extractOrcidFromAccountId(accountId: string): string {
  if (!isOrcidAccount(accountId)) {
    throw new Error(
      `Cannot extract ORCID: '${accountId}' is not an ORCID account.`,
    );
  }

  const accountIdAsBigInt = BigInt(accountId);
  // Extract nameEncoded from bits 0-215 (216 bits) using bit mask
  // (1n << 216n) - 1n creates mask of 216 ones: 0x0...0FFFFFFFFFF...FF
  const nameEncoded = accountIdAsBigInt & ((1n << 216n) - 1n);

  // Convert BigInt to hex string, then to bytes and remove null padding
  const nameBytes = nameEncoded.toString(16).padStart(54, '0'); // 216 bits = 27 bytes = 54 hex chars
  const nameStr = Buffer.from(nameBytes, 'hex')
    .toString('utf8')
    .replace(/\0+$/, '');

  return nameStr;
}
