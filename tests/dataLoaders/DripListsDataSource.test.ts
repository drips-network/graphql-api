import { describe, beforeEach, expect, vi, it } from 'vitest';
import DripListsDataSource from '../../src/dataLoaders/DripListsDataSource';

vi.mock('../../src/dataLoaders/sqlQueries/dripListsQueries');

describe('DripListsDataSource', () => {
  let dataSource: DripListsDataSource;

  beforeEach(() => {
    vi.clearAllMocks();

    dataSource = new DripListsDataSource();
    dataSource.getDripListsByFilter = vi.fn();
  });

  describe('getDripListsByFilter', () => {
    it('should pass limit parameter to SQL queries', async () => {
      await dataSource.getDripListsByFilter(['mainnet'], {}, 75);

      expect(dataSource.getDripListsByFilter).toHaveBeenCalledWith(
        ['mainnet'],
        {},
        75,
      );
    });

    it('should pass undefined limit when no limit is specified', async () => {
      await dataSource.getDripListsByFilter(['mainnet'], {}, undefined);

      expect(dataSource.getDripListsByFilter).toHaveBeenCalledWith(
        ['mainnet'],
        {},
        undefined,
      );
    });
  });
});
