import { describe, it, expect } from 'vitest';
import validateOrcidAccountsInput from '../../src/orcid-account/orcidAccountValidators';
import { OrcidAccountSortField } from '../../src/generated/graphql';

describe('validateOrcidAccountsInput', () => {
  describe('sort validation', () => {
    it('should accept valid createdAt sort field', () => {
      expect(() => {
        validateOrcidAccountsInput({
          sort: { field: OrcidAccountSortField.createdAt },
        });
      }).not.toThrow();
    });

    it('should reject invalid sort field', () => {
      expect(() => {
        validateOrcidAccountsInput({
          sort: { field: 'invalidField' as any },
        });
      }).toThrow(
        'Invalid sort field: invalidField. Valid fields are: createdAt',
      );
    });

    it('should accept input without sort parameter', () => {
      expect(() => {
        validateOrcidAccountsInput({});
      }).not.toThrow();
    });

    it('should accept undefined sort parameter', () => {
      expect(() => {
        validateOrcidAccountsInput({
          sort: undefined,
        });
      }).not.toThrow();
    });

    it('should accept sort with undefined field', () => {
      expect(() => {
        validateOrcidAccountsInput({
          sort: { field: undefined as any },
        });
      }).not.toThrow();
    });
  });

  describe('limit validation', () => {
    it('should accept valid positive integer limit', () => {
      expect(() => {
        validateOrcidAccountsInput({
          limit: 10,
        });
      }).not.toThrow();
    });

    it('should accept limit of 1', () => {
      expect(() => {
        validateOrcidAccountsInput({
          limit: 1,
        });
      }).not.toThrow();
    });

    it('should accept limit of 1000', () => {
      expect(() => {
        validateOrcidAccountsInput({
          limit: 1000,
        });
      }).not.toThrow();
    });

    it('should reject limit of 0', () => {
      expect(() => {
        validateOrcidAccountsInput({
          limit: 0,
        });
      }).toThrow('Limit must be between 1 and 1000');
    });

    it('should reject negative limit', () => {
      expect(() => {
        validateOrcidAccountsInput({
          limit: -5,
        });
      }).toThrow('Limit must be between 1 and 1000');
    });

    it('should reject limit exceeding 1000', () => {
      expect(() => {
        validateOrcidAccountsInput({
          limit: 1001,
        });
      }).toThrow('Limit must be between 1 and 1000');
    });

    it('should accept input without limit parameter', () => {
      expect(() => {
        validateOrcidAccountsInput({
          sort: { field: OrcidAccountSortField.createdAt },
        });
      }).not.toThrow();
    });

    it('should accept undefined limit parameter', () => {
      expect(() => {
        validateOrcidAccountsInput({
          limit: undefined,
        });
      }).not.toThrow();
    });
  });

  describe('combined validation', () => {
    it('should accept valid sort and limit combination', () => {
      expect(() => {
        validateOrcidAccountsInput({
          sort: { field: OrcidAccountSortField.createdAt },
          limit: 100,
        });
      }).not.toThrow();
    });

    it('should reject invalid sort field even with valid limit', () => {
      expect(() => {
        validateOrcidAccountsInput({
          sort: { field: 'invalidField' as any },
          limit: 100,
        });
      }).toThrow(
        'Invalid sort field: invalidField. Valid fields are: createdAt',
      );
    });

    it('should reject invalid limit even with valid sort', () => {
      expect(() => {
        validateOrcidAccountsInput({
          sort: { field: OrcidAccountSortField.createdAt },
          limit: 1001,
        });
      }).toThrow('Limit must be between 1 and 1000');
    });
  });
});
