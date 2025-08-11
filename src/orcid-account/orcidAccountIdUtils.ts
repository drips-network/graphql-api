/* eslint-disable no-bitwise */

import { isRepoDriverId } from '../utils/assert';

/**
 * ForgeId for ORCID in RepoDriver account IDs.
 *
 * Value is 4 (not 2 like the Forge.ORCID enum) because the forgeId field encodes
 * both forge type and name length constraints:
 * - 0,1: GitHub (supports different name lengths)
 * - 2,3: GitLab (supports different name lengths)
 * - 4: ORCID (fixed format: XXXX-XXXX-XXXX-XXXX)
 *
 * This allows the account ID bit structure to efficiently pack forge identification
 * and validation rules into a single field.
 */
export const ORCID_FORGE_ID = 4;

function extractForgeFromAccountId(accountId: string): number {
  if (!isRepoDriverId(accountId)) {
    throw new Error(
      `Cannot extract forge: '${accountId}' is not a RepoDriver ID.`,
    );
  }

  const accountIdAsBigInt = BigInt(accountId);
  // RepoDriver account ID structure: [32-bit driverId][8-bit forgeId][216-bit nameEncoded]
  // Extract forgeId from bits 216-223 (8 bits) by shifting right 216 bits and masking
  const forgeId = (accountIdAsBigInt >> 216n) & 0xffn;
  return Number(forgeId);
}

export function isOrcidAccount(accountId: string): boolean {
  try {
    return (
      isRepoDriverId(accountId) &&
      extractForgeFromAccountId(accountId) === ORCID_FORGE_ID
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
