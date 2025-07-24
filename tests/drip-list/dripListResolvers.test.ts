import { describe, test, beforeEach, expect, vi } from 'vitest';
import { SupportedChain } from '../../src/generated/graphql';
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
        args.limit,
      );
    });
  });
});
