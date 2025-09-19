import { describe, it, expect } from 'vitest';
import {
  SortDirection,
  LinkedIdentitySortField,
} from '../../src/generated/graphql';
import validateLinkedIdentitiesInput from '../../src/linked-identity/linkedIdentityValidators';

describe('linkedIdentityValidators', () => {
  describe('sort validation', () => {
    it('should accept valid createdAt sort field', () => {
      expect(() => {
        validateLinkedIdentitiesInput({
          sort: {
            field: LinkedIdentitySortField.createdAt,
            direction: SortDirection.DESC,
          },
        } as any);
      }).not.toThrow();
    });

    it('should reject invalid sort field', () => {
      expect(() => {
        validateLinkedIdentitiesInput({
          sort: { field: 'invalidField' as any },
        } as any);
      }).toThrow(
        'Invalid sort field: invalidField. Valid fields are: createdAt',
      );
    });

    it('should reject invalid sort direction', () => {
      expect(() => {
        validateLinkedIdentitiesInput({
          sort: {
            field: LinkedIdentitySortField.createdAt,
            direction: 'INVALID' as any,
          },
        } as any);
      }).toThrow('Invalid sort direction.');
    });

    it('should accept valid ASC direction', () => {
      expect(() => {
        validateLinkedIdentitiesInput({
          sort: {
            field: LinkedIdentitySortField.createdAt,
            direction: SortDirection.ASC,
          },
        } as any);
      }).not.toThrow();
    });

    it('should accept valid DESC direction', () => {
      expect(() => {
        validateLinkedIdentitiesInput({
          sort: {
            field: LinkedIdentitySortField.createdAt,
            direction: SortDirection.DESC,
          },
        } as any);
      }).not.toThrow();
    });

    it('should accept sort field without direction', () => {
      expect(() => {
        validateLinkedIdentitiesInput({
          sort: { field: LinkedIdentitySortField.createdAt },
        } as any);
      }).not.toThrow();
    });

    it('should accept empty input without throwing', () => {
      expect(() => {
        validateLinkedIdentitiesInput({} as any);
      }).not.toThrow();
    });

    it('should accept undefined sort parameter', () => {
      expect(() => {
        validateLinkedIdentitiesInput({
          sort: undefined,
        } as any);
      }).not.toThrow();
    });
  });

  describe('limit validation', () => {
    it('should accept valid positive integer limit', () => {
      expect(() => {
        validateLinkedIdentitiesInput({
          limit: 10,
        } as any);
      }).not.toThrow();
    });

    it('should accept limit of 1000', () => {
      expect(() => {
        validateLinkedIdentitiesInput({
          limit: 1000,
        } as any);
      }).not.toThrow();
    });

    it('should accept limit of 0 (falsy value)', () => {
      expect(() => {
        validateLinkedIdentitiesInput({
          limit: 0,
        } as any);
      }).not.toThrow();
    });

    it('should reject negative limit', () => {
      expect(() => {
        validateLinkedIdentitiesInput({
          limit: -5,
        } as any);
      }).toThrow('Limit must be a positive integer.');
    });

    it('should reject limit exceeding 1000', () => {
      expect(() => {
        validateLinkedIdentitiesInput({
          limit: 1001,
        } as any);
      }).toThrow('Limit cannot exceed 1000.');
    });

    it('should accept input without limit parameter', () => {
      expect(() => {
        validateLinkedIdentitiesInput({
          sort: { field: LinkedIdentitySortField.createdAt },
        } as any);
      }).not.toThrow();
    });
  });

  describe('existing validation compatibility', () => {
    it('should still validate where.accountId input correctly', () => {
      expect(() => {
        validateLinkedIdentitiesInput({
          where: { accountId: 'invalid-id' },
        } as any);
      }).toThrow('Could not get bits: invalid-id is not a number');
    });

    it('should still validate owner address correctly', () => {
      expect(() => {
        validateLinkedIdentitiesInput({
          where: { ownerAddress: 'invalid-address' },
        } as any);
      }).toThrow('Invalid linked identity owner address.');
    });
  });
});
