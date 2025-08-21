import { describe, test, expect } from 'vitest';
import { isOrcidId } from '../../src/utils/assert';

describe('isOrcidId', () => {
  test('should return true for valid ORCID IDs', () => {
    // Valid ORCID ID patterns
    expect(isOrcidId('0009-0007-1106-8413')).toBe(true);
    expect(isOrcidId('0000-0002-9079-593X')).toBe(true);
  });

  test('should return false for invalid ORCID IDs', () => {
    // Invalid patterns
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
    expect(isOrcidId('0000-0001-5109-370X')).toBe(false); // Incorrect X position
    expect(isOrcidId('0000-0002-1825-0098')).toBe(false); // Fails checksum
  });
});
