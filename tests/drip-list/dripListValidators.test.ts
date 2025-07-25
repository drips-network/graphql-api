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

  describe('existing validation compatibility', () => {
    it('should still validate where input correctly', () => {
      expect(() => {
        verifyDripListsInput({
          where: { id: 'invalid-id' },
        });
      }).toThrow('Cannot convert invalid-id to a BigInt');
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
