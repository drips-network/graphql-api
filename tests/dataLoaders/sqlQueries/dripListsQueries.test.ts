import { describe, beforeEach, expect, vi, it } from 'vitest';
import {
  DripListSortField,
  SortDirection,
} from '../../../src/generated/graphql';
import { dbConnection } from '../../../src/database/connectToDatabase';
import dripListsQueries from '../../../src/dataLoaders/sqlQueries/dripListsQueries';

vi.mock('../../../src/database/connectToDatabase', () => ({
  dbConnection: {
    query: vi.fn().mockResolvedValue([]),
  },
}));

describe('dripListsQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getByFilter', () => {
    it('should apply the default limit of 100 when no limit is specified', async () => {
      await dripListsQueries.getByFilter(['mainnet'], {}, undefined, undefined);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 100'),
        expect.anything(),
      );
    });

    it('should use the provided limit when specified', async () => {
      await dripListsQueries.getByFilter(['mainnet'], {}, undefined, 75);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 75'),
        expect.anything(),
      );
    });

    it('should cap limit at maximum of 1000', async () => {
      await dripListsQueries.getByFilter(['mainnet'], {}, undefined, 1500);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1000'),
        expect.anything(),
      );
    });

    it('should handle limit of 0 by using fallback', async () => {
      await dripListsQueries.getByFilter(['mainnet'], {}, undefined, 0);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 100'),
        expect.anything(),
      );
    });

    it('should handle negative limits by using minimum of 1', async () => {
      await dripListsQueries.getByFilter(['mainnet'], {}, undefined, -10);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1'),
        expect.anything(),
      );
    });

    it('should use exactly 1000 when provided', async () => {
      await dripListsQueries.getByFilter(['mainnet'], {}, undefined, 1000);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1000'),
        expect.anything(),
      );
    });
  });

  describe('sorting functionality', () => {
    it('should generate CTE query with INNER JOIN when sorting by mintedAt', async () => {
      await dripListsQueries.getByFilter(
        ['mainnet'],
        {},
        { field: DripListSortField.mintedAt, direction: SortDirection.DESC },
        100,
      );

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringMatching(/WITH mint_events AS.*INNER JOIN mint_events/s),
        expect.anything(),
      );
    });

    it('should use standard query when no sorting is specified', async () => {
      await dripListsQueries.getByFilter(['mainnet'], {}, undefined, 100);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.not.stringMatching(/WITH mint_events/),
        expect.anything(),
      );
    });

    it('should apply correct ORDER BY clause for mintedAt DESC', async () => {
      await dripListsQueries.getByFilter(
        ['mainnet'],
        {},
        { field: DripListSortField.mintedAt, direction: SortDirection.DESC },
        100,
      );

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY me."mintedAt" DESC'),
        expect.anything(),
      );
    });

    it('should default to DESC when direction not specified', async () => {
      await dripListsQueries.getByFilter(
        ['mainnet'],
        {},
        { field: DripListSortField.mintedAt },
        100,
      );

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY me."mintedAt" DESC'),
        expect.anything(),
      );
    });

    it('should apply ASC direction when specified', async () => {
      await dripListsQueries.getByFilter(
        ['mainnet'],
        {},
        { field: DripListSortField.mintedAt, direction: SortDirection.ASC },
        100,
      );

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY me."mintedAt" ASC'),
        expect.anything(),
      );
    });
  });
});
