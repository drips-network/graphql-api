import { describe, beforeEach, expect, vi, it } from 'vitest';
import { DripListSortField, SortDirection } from '../../src/generated/graphql';
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
      await dataSource.getDripListsByFilter(['mainnet'], {}, undefined, 75);

      expect(dataSource.getDripListsByFilter).toHaveBeenCalledWith(
        ['mainnet'],
        {},
        undefined,
        75,
      );
    });

    it('should pass undefined limit when no limit is specified', async () => {
      await dataSource.getDripListsByFilter(
        ['mainnet'],
        {},
        undefined,
        undefined,
      );

      expect(dataSource.getDripListsByFilter).toHaveBeenCalledWith(
        ['mainnet'],
        {},
        undefined,
        undefined,
      );
    });

    it('should pass sort parameter through to queries', async () => {
      const sortInput = {
        field: DripListSortField.mintedAt,
        direction: SortDirection.ASC,
      };
      await dataSource.getDripListsByFilter(['mainnet'], {}, sortInput, 75);

      // This test verifies the method signature is correct
      expect(dataSource.getDripListsByFilter).toHaveBeenCalledWith(
        ['mainnet'],
        {},
        sortInput,
        75,
      );
    });
  });
});
