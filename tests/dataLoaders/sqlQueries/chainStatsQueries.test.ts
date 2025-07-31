import { describe, test, expect, vi, beforeEach } from 'vitest';
import chainStatsQueries from '../../../src/dataLoaders/sqlQueries/chainStatsQueries';
import { dbConnection } from '../../../src/database/connectToDatabase';

vi.mock('../../../src/database/connectToDatabase');

describe('chainStatsQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getChainStats', () => {
    test('should return stats for single chain', async () => {
      vi.mocked(dbConnection.query)
        .mockResolvedValueOnce([{ count: '5' }] as any) // dripLists
        .mockResolvedValueOnce([{ count: '3' }] as any) // claimedProjects
        .mockResolvedValueOnce([{ count: '10' }] as any); // receivers

      const result = await chainStatsQueries.getChainStats(['mainnet']);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        chain: 'mainnet',
        dripListsCount: 5,
        claimedProjectsCount: 3,
        receiversCount: 10,
      });

      expect(dbConnection.query).toHaveBeenCalledTimes(3);
    });

    test('should return stats for multiple chains', async () => {
      vi.mocked(dbConnection.query)
        .mockResolvedValueOnce([{ count: '5' }] as any) // mainnet dripLists
        .mockResolvedValueOnce([{ count: '3' }] as any) // mainnet claimedProjects
        .mockResolvedValueOnce([{ count: '10' }] as any) // mainnet receivers
        .mockResolvedValueOnce([{ count: '2' }] as any) // sepolia dripLists
        .mockResolvedValueOnce([{ count: '1' }] as any) // sepolia claimedProjects
        .mockResolvedValueOnce([{ count: '4' }] as any); // sepolia receivers

      const result = await chainStatsQueries.getChainStats([
        'mainnet',
        'sepolia',
      ]);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.chain)).toEqual(['mainnet', 'sepolia']);
      expect(result[0]).toMatchObject({
        chain: 'mainnet',
        dripListsCount: 5,
        claimedProjectsCount: 3,
        receiversCount: 10,
      });
      expect(result[1]).toMatchObject({
        chain: 'sepolia',
        dripListsCount: 2,
        claimedProjectsCount: 1,
        receiversCount: 4,
      });
    });

    test('should handle empty chain array', async () => {
      const result = await chainStatsQueries.getChainStats([]);

      expect(result).toEqual([]);
      expect(dbConnection.query).not.toHaveBeenCalled();
    });

    test('should execute correct SQL queries with proper filters', async () => {
      vi.mocked(dbConnection.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([{ count: '3' }] as any)
        .mockResolvedValueOnce([{ count: '10' }] as any);

      await chainStatsQueries.getChainStats(['mainnet']);

      const { calls } = vi.mocked(dbConnection.query).mock;

      expect(calls[0][0]).toContain('"is_valid" = true');
      expect(calls[0][0]).toContain('FROM "mainnet"."drip_lists"');

      expect(calls[1][0]).toContain('"verification_status" = \'claimed\'');
      expect(calls[1][0]).toContain('FROM "mainnet"."projects"');

      expect(calls[2][0]).toContain('"splits_receivers"');
    });

    test('should reject invalid database schemas', async () => {
      await expect(
        chainStatsQueries.getChainStats(['invalid_schema'] as any),
      ).rejects.toThrow('Invalid database schemas: invalid_schema');

      expect(dbConnection.query).not.toHaveBeenCalled();
    });

    test('should reject multiple invalid schemas', async () => {
      await expect(
        chainStatsQueries.getChainStats(['invalid1', 'invalid2'] as any),
      ).rejects.toThrow('Invalid database schemas: invalid1, invalid2');

      expect(dbConnection.query).not.toHaveBeenCalled();
    });
  });
});
