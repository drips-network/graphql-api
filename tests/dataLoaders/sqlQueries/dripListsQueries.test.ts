import { describe, beforeEach, expect, vi, it } from 'vitest';
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
      await dripListsQueries.getByFilter(['mainnet'], {}, undefined);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 100'),
        expect.anything(),
      );
    });

    it('should use the provided limit when specified', async () => {
      await dripListsQueries.getByFilter(['mainnet'], {}, 75);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 75'),
        expect.anything(),
      );
    });

    it('should cap limit at maximum of 1000', async () => {
      await dripListsQueries.getByFilter(['mainnet'], {}, 1500);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1000'),
        expect.anything(),
      );
    });

    it('should handle limit of 0 by using fallback', async () => {
      await dripListsQueries.getByFilter(['mainnet'], {}, 0);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 100'),
        expect.anything(),
      );
    });

    it('should handle negative limits by using minimum of 1', async () => {
      await dripListsQueries.getByFilter(['mainnet'], {}, -10);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1'),
        expect.anything(),
      );
    });

    it('should use exactly 1000 when provided', async () => {
      await dripListsQueries.getByFilter(['mainnet'], {}, 1000);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1000'),
        expect.anything(),
      );
    });
  });
});
