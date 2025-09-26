import { describe, test, expect } from 'vitest';
import {
  isOrcidId,
  isLinkedIdentityId,
  assertIsLinkedIdentityId,
} from '../../src/utils/assert';

describe('isOrcidId', () => {
  test('should return true for valid ORCID IDs', () => {
    // Valid ORCID ID patterns with correct checksums
    expect(isOrcidId('0000-0003-1527-0030')).toBe(true);
  });

  test('should return false for invalid ORCID IDs', () => {
    // Invalid patterns
    expect(isOrcidId('0000-0002-1825-009X')).toBe(false); // Invalid checksum
    expect(isOrcidId('000-0000-0000-0000')).toBe(false); // Too few digits in first group
    expect(isOrcidId('0000-000-0000-0000')).toBe(false); // Too few digits in second group
    expect(isOrcidId('0000-0000-000-0000')).toBe(false); // Too few digits in third group
    expect(isOrcidId('0000-0000-0000-00')).toBe(false); // Too few digits in last group
    expect(isOrcidId('00000-0000-0000-0000')).toBe(false); // Too many digits in first group
    expect(isOrcidId('0000-00000-0000-0000')).toBe(false); // Too many digits in second group
    expect(isOrcidId('0000-0000-00000-0000')).toBe(false); // Too many digits in third group
    expect(isOrcidId('0000-0000-0000-00000')).toBe(false); // Too many digits in last group
    expect(isOrcidId('0000-0000-0000-000Y')).toBe(false); // Invalid character (Y instead of X)
    expect(isOrcidId('0000-0000-0000-000x')).toBe(false); // Lowercase x instead of uppercase X
    expect(isOrcidId('0000/0000/0000/0000')).toBe(false); // Wrong separator
    expect(isOrcidId('0000.0000.0000.0000')).toBe(false); // Wrong separator
    expect(isOrcidId('0000000000000000')).toBe(false); // No separators
    expect(isOrcidId('0000-0000-0000-')).toBe(false); // Missing last group
    expect(isOrcidId('-0000-0000-0000')).toBe(false); // Missing first group
    expect(isOrcidId('')).toBe(false); // Empty string
    expect(isOrcidId('abc-def-ghi-jkl')).toBe(false); // Letters instead of digits
    expect(isOrcidId('0000-0000-0000-000@')).toBe(false); // Invalid special character
  });
});

describe('isLinkedIdentityId', () => {
  test('should return true for valid LinkedIdentity IDs (RepoDriver IDs)', () => {
    // Valid RepoDriver ID: bits 224-255 = 3.
    // 3 << 224 = correct RepoDriver ID.
    const validRepoDriverId =
      '80879840001451919384001045261058892020911433267621717443310830747648';
    expect(isLinkedIdentityId(validRepoDriverId)).toBe(true);

    // Another valid RepoDriver ID with additional lower bits.
    const anotherValidId =
      '80879840001451919384001045261058892020911433267621717443310830759993';
    expect(isLinkedIdentityId(anotherValidId)).toBe(true);
  });

  test('should return false for invalid LinkedIdentity IDs', () => {
    // AddressDriver ID (bits 224-255 = 0).
    expect(isLinkedIdentityId('12345')).toBe(false);

    // NftDriver ID (bits 224-255 = 1).
    const nftDriverId =
      '26901687296710516822853782146149225901709767165618014807573589';
    expect(isLinkedIdentityId(nftDriverId)).toBe(false);

    // Not a number - throws due to getContractNameFromAccountId being called.
    expect(() => isLinkedIdentityId('not-a-number')).toThrow(
      'Could not get bits: not-a-number is not a number.',
    );

    // Empty string converts to 0, which is AddressDriver (bits 224-255 = 0).
    expect(isLinkedIdentityId('')).toBe(false);
  });
});

describe('assertIsLinkedIdentityId', () => {
  test('should not throw for valid LinkedIdentity IDs', () => {
    const validRepoDriverId =
      '80879840001451919384001045261058892020911433267621717443310830747648';
    expect(() => assertIsLinkedIdentityId(validRepoDriverId)).not.toThrow();

    const anotherValidId =
      '80879840001451919384001045261058892020911433267621717443310830759993';
    expect(() => assertIsLinkedIdentityId(anotherValidId)).not.toThrow();
  });

  test('should throw for invalid LinkedIdentity IDs', () => {
    // Invalid IDs should throw with specific error message.
    expect(() => assertIsLinkedIdentityId('12345')).toThrowError(
      "Failed to assert: '12345' is not a valid LinkedIdentity ID.",
    );

    // Non-numeric string throws a different error from getContractNameFromAccountId.
    expect(() => assertIsLinkedIdentityId('not-a-number')).toThrowError(
      'Could not get bits: not-a-number is not a number.',
    );
  });
});
