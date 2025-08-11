import { describe, it, expect } from 'vitest';
import {
  ORCID_FORGE_ID,
  isOrcidAccount,
  extractOrcidFromAccountId,
} from '../../src/orcid-account/orcidAccountIdUtils';

describe('orcidAccountIdUtils', () => {
  describe('ORCID_FORGE_ID', () => {
    it('should be 4', () => {
      expect(ORCID_FORGE_ID).toBe(4);
    });
  });

  describe('isOrcidAccount', () => {
    it('should return true for valid ORCID RepoDriver account IDs', () => {
      // Valid ORCID account ID with forge ID 4 at bits 216-223.
      const validOrcidAccountId =
        '81320912658542974439730181977206773330805723773165208113981035642880';
      expect(isOrcidAccount(validOrcidAccountId)).toBe(true);
    });

    it('should return false for non-RepoDriver IDs', () => {
      expect(isOrcidAccount('not-a-number')).toBe(false);
      expect(isOrcidAccount('12345')).toBe(false);
      expect(isOrcidAccount('')).toBe(false);
    });

    it('should return false for RepoDriver IDs with different forge IDs', () => {
      // GitHub account ID (forge ID 0).
      const githubAccountId = '738277613033851957932085857866483303468';
      expect(isOrcidAccount(githubAccountId)).toBe(false);
    });

    it('should handle edge cases gracefully', () => {
      expect(isOrcidAccount('0')).toBe(false);
      expect(isOrcidAccount('-1')).toBe(false);
    });
  });

  describe('extractOrcidFromAccountId', () => {
    it('should extract ORCID identifier from valid account ID', () => {
      // Valid ORCID account ID.
      const accountIdWithOrcid =
        '81320912658542974439730181977206773330805723773165208113981035642880';

      const orcid = extractOrcidFromAccountId(accountIdWithOrcid);
      expect(orcid).toBeTruthy();
      expect(typeof orcid).toBe('string');
      // ORCID should match the pattern XXXX-XXXX-XXXX-XXXX or XXXX-XXXX-XXXX-XXXX.
      expect(orcid).toMatch(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/);
    });

    it('should throw error for non-ORCID account IDs', () => {
      const githubAccountId = '738277613033851957932085857866483303468';
      expect(() => extractOrcidFromAccountId(githubAccountId)).toThrow(
        `Cannot extract ORCID: '${githubAccountId}' is not an ORCID account.`,
      );
    });

    it('should throw error for invalid account IDs', () => {
      expect(() => extractOrcidFromAccountId('not-a-number')).toThrow(
        "Cannot extract ORCID: 'not-a-number' is not an ORCID account.",
      );

      expect(() => extractOrcidFromAccountId('')).toThrow(
        "Cannot extract ORCID: '' is not an ORCID account.",
      );
    });

    it('should throw error for numeric strings that are not ORCID accounts', () => {
      expect(() => extractOrcidFromAccountId('12345')).toThrow(
        "Cannot extract ORCID: '12345' is not an ORCID account.",
      );
    });
  });
});
