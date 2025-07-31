import { describe, test, expect, vi, beforeEach } from 'vitest';
import commonResolvers from '../../src/common/commonResolvers';
import chainStatsQueries from '../../src/dataLoaders/sqlQueries/chainStatsQueries';
import { SupportedChain } from '../../src/generated/graphql';

vi.mock('../../src/dataLoaders/sqlQueries/chainStatsQueries');

describe('commonResolvers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Query', () => {
    describe('chainStats', () => {
      test('should return stats for specified chains', async () => {
        vi.mocked(chainStatsQueries.getChainStats).mockResolvedValueOnce([
          {
            chain: 'mainnet',
            dripListsCount: 42,
            claimedProjectsCount: 23,
            receiversCount: 100,
          },
          {
            chain: 'sepolia',
            dripListsCount: 5,
            claimedProjectsCount: 3,
            receiversCount: 15,
          },
        ]);

        const result = await commonResolvers.Query.chainStats(null, {
          chains: [SupportedChain.MAINNET, SupportedChain.SEPOLIA],
        });

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          chain: SupportedChain.MAINNET,
          dripListsCount: 42,
          claimedProjectsCount: 23,
          receiversCount: 100,
        });
        expect(result[1]).toEqual({
          chain: SupportedChain.SEPOLIA,
          dripListsCount: 5,
          claimedProjectsCount: 3,
          receiversCount: 15,
        });

        expect(chainStatsQueries.getChainStats).toHaveBeenCalledWith([
          'mainnet',
          'sepolia',
        ]);
      });

      test('should return stats for all queryable chains when no chains specified', async () => {
        vi.mocked(chainStatsQueries.getChainStats).mockResolvedValueOnce([
          {
            chain: 'mainnet',
            dripListsCount: 42,
            claimedProjectsCount: 23,
            receiversCount: 100,
          },
        ]);

        const result = await commonResolvers.Query.chainStats(null, {});

        expect(result).toHaveLength(1);
        expect(
          result.every((stat) =>
            Object.values(SupportedChain).includes(stat.chain),
          ),
        ).toBe(true);

        expect(chainStatsQueries.getChainStats).toHaveBeenCalled();
      });
    });
  });
});
