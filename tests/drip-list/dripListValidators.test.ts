import { describe, it, expect } from 'vitest';
import { SortDirection, DripListSortField } from '../../src/generated/graphql';
import verifyDripListsInput from '../../src/drip-list/dripListValidators';

describe('dripListValidators', () => {
  describe('sort validation', () => {
    it('should accept valid mintedAt sort field', () => {
      expect(() => {
        verifyDripListsInput({
          sort: {
            field: DripListSortField.mintedAt,
            direction: SortDirection.DESC,
          },
        });
      }).not.toThrow();
    });

    it('should reject invalid sort field', () => {
      expect(() => {
        verifyDripListsInput({
          sort: { field: 'invalidField' as any },
        });
      }).toThrow('Invalid sort field.');
    });

    it('should reject invalid sort direction', () => {
      expect(() => {
        verifyDripListsInput({
          sort: {
            field: DripListSortField.mintedAt,
            direction: 'INVALID' as any,
          },
        });
      }).toThrow('Invalid sort direction.');
    });

    it('should accept valid ASC direction', () => {
      expect(() => {
        verifyDripListsInput({
          sort: {
            field: DripListSortField.mintedAt,
            direction: SortDirection.ASC,
          },
        });
      }).not.toThrow();
    });

    it('should accept valid DESC direction', () => {
      expect(() => {
        verifyDripListsInput({
          sort: {
            field: DripListSortField.mintedAt,
            direction: SortDirection.DESC,
          },
        });
      }).not.toThrow();
    });

    it('should accept sort field without direction', () => {
      expect(() => {
        verifyDripListsInput({
          sort: { field: DripListSortField.mintedAt },
        });
      }).not.toThrow();
    });

    it('should accept empty input without throwing', () => {
      expect(() => {
        verifyDripListsInput({});
      }).not.toThrow();
    });

    it('should accept undefined sort parameter', () => {
      expect(() => {
        verifyDripListsInput({
          sort: undefined,
        });
      }).not.toThrow();
    });
  });

  describe('limit validation', () => {
    it('should accept valid positive integer limit', () => {
      expect(() => {
        verifyDripListsInput({
          limit: 10,
        });
      }).not.toThrow();
    });

    it('should accept limit of 1000', () => {
      expect(() => {
        verifyDripListsInput({
          limit: 1000,
        });
      }).not.toThrow();
    });

    it('should accept limit of 0 (falsy value)', () => {
      expect(() => {
        verifyDripListsInput({
          limit: 0,
        });
      }).not.toThrow();
    });

    it('should reject negative limit', () => {
      expect(() => {
        verifyDripListsInput({
          limit: -5,
        });
      }).toThrow('Limit must be a positive integer.');
    });

    it('should reject limit exceeding 1000', () => {
      expect(() => {
        verifyDripListsInput({
          limit: 1001,
        });
      }).toThrow('Limit cannot exceed 1000.');
    });

    it('should accept input without limit parameter', () => {
      expect(() => {
        verifyDripListsInput({
          sort: { field: DripListSortField.mintedAt },
        });
      }).not.toThrow();
    });
  });

  describe('existing validation compatibility', () => {
    it('should still validate where input correctly', () => {
      expect(() => {
        verifyDripListsInput({
          where: { accountId: 'invalid-id' },
        });
      }).toThrow('Could not get bits: invalid-id is not a number');
    });

    it('should still validate owner address correctly', () => {
      expect(() => {
        verifyDripListsInput({
          where: { ownerAddress: 'invalid-address' },
        });
      }).toThrow('Invalid owner address.');
    });
  });
});
