import { describe, test, beforeEach, expect, vi } from 'vitest';
import {
  SupportedChain,
  SortDirection,
  DripListSortField,
} from '../../src/generated/graphql';
import DripListsDataSource from '../../src/dataLoaders/DripListsDataSource';
import dripListResolvers from '../../src/drip-list/dripListResolvers';

vi.mock('../../src/drip-list/dripListUtils');

describe('dripListResolvers', () => {
  let dataSource: DripListsDataSource;

  beforeEach(() => {
    vi.clearAllMocks();

    dataSource = new DripListsDataSource();
    dataSource.getDripListsByFilter = vi.fn();
  });

  describe('dripLists', () => {
    test('should pass the limit parameter', async () => {
      const args = {
        chains: [SupportedChain.MAINNET],
        limit: 75,
      };

      await dripListResolvers.Query.dripLists(undefined, args, {
        dataSources: {
          dripListsDataSource: dataSource,
        } as any,
      });

      expect(dataSource.getDripListsByFilter).toHaveBeenCalledWith(
        ['mainnet'],
        undefined,
        undefined,
        args.limit,
      );
    });

    test('passes undefined limit when not provided', async () => {
      const args = {
        chains: [SupportedChain.MAINNET],
        limit: undefined,
      };

      await dripListResolvers.Query.dripLists(undefined, args, {
        dataSources: {
          dripListsDataSource: dataSource,
        } as any,
      });

      expect(dataSource.getDripListsByFilter).toHaveBeenCalledWith(
        ['mainnet'],
        undefined,
        undefined,
        args.limit,
      );
    });

    test('should pass sort parameter to data source', async () => {
      const sortInput = {
        field: DripListSortField.mintedAt,
        direction: SortDirection.DESC,
      };
      const args = {
        chains: [SupportedChain.MAINNET],
        sort: sortInput,
        limit: 50,
      };

      await dripListResolvers.Query.dripLists(undefined, args, {
        dataSources: { dripListsDataSource: dataSource } as any,
      });

      expect(dataSource.getDripListsByFilter).toHaveBeenCalledWith(
        ['mainnet'],
        undefined,
        sortInput,
        50,
      );
    });

    test('should handle undefined sort parameter', async () => {
      const args = {
        chains: [SupportedChain.MAINNET],
        sort: undefined,
      };

      await dripListResolvers.Query.dripLists(undefined, args, {
        dataSources: { dripListsDataSource: dataSource } as any,
      });

      expect(dataSource.getDripListsByFilter).toHaveBeenCalledWith(
        ['mainnet'],
        undefined,
        undefined,
        undefined,
      );
    });
  });
});
