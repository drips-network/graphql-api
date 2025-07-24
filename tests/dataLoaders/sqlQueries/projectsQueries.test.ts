import { describe, it, beforeEach, expect, vi } from 'vitest';
import projectsQueries from '../../../src/dataLoaders/sqlQueries/projectsQueries';
import { dbConnection } from '../../../src/database/connectToDatabase';

vi.mock('../../../src/database/connectToDatabase', () => ({
  dbConnection: {
    query: vi.fn().mockResolvedValue([]),
  },
}));

describe('projectsQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getByFilter', () => {
    it('should apply the default limit of 100 when no limit is specified', async () => {
      await projectsQueries.getByFilter(['mainnet'], {}, undefined, undefined);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 100'),
        expect.anything(),
      );
    });

    it('should use the provided limit when specified', async () => {
      await projectsQueries.getByFilter(['mainnet'], {}, undefined, 50);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50'),
        expect.anything(),
      );
    });

    it('should cap limit at maximum of 1000', async () => {
      await projectsQueries.getByFilter(['mainnet'], {}, undefined, 2000);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1000'),
        expect.anything(),
      );
    });

    it('should handle limit of 0 by using fallback', async () => {
      await projectsQueries.getByFilter(['mainnet'], {}, undefined, 0);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 100'),
        expect.anything(),
      );
    });

    it('should handle negative limits by using minimum of 1', async () => {
      await projectsQueries.getByFilter(['mainnet'], {}, undefined, -5);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1'),
        expect.anything(),
      );
    });

    it('should use exactly 1000 when provided', async () => {
      await projectsQueries.getByFilter(['mainnet'], {}, undefined, 1000);

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1000'),
        expect.anything(),
      );
    });
  });
});
