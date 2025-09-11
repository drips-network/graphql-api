/* eslint-disable no-bitwise */

import { describe, beforeEach, expect, vi, it } from 'vitest';
import LinkedIdentityDataSource from '../../src/dataLoaders/LinkedIdentityDataSource';
import type { LinkedIdentityDataValues } from '../../src/linked-identity/LinkedIdentityModel';
import type {
  RepoDriverId,
  Address,
  DbSchema,
  LinkedIdentityMultiChainKey,
  AddressDriverId,
  LinkedIdentityId,
} from '../../src/common/types';
import linkedIdentityQueries from '../../src/dataLoaders/sqlQueries/linkedIdentityQueries';
import parseMultiChainKeys from '../../src/utils/parseMultiChainKeys';

vi.mock('../../src/dataLoaders/sqlQueries/linkedIdentityQueries', () => ({
  default: {
    getByIds: vi.fn(),
    getByOwnerAddress: vi.fn(),
    getLinkedIdentitiesByFilter: vi.fn(),
  },
}));

vi.mock('../../src/utils/parseMultiChainKeys', () => ({
  default: vi.fn(),
}));

describe('LinkedIdentityDataSource', () => {
  let dataSource: LinkedIdentityDataSource;

  beforeEach(() => {
    vi.clearAllMocks();
    dataSource = new LinkedIdentityDataSource();
  });

  describe('getLinkedIdentitiesByOwnerAddress', () => {
    it('should call linkedIdentityQueries.getByOwnerAddress with correct parameters', async () => {
      const chains: DbSchema[] = ['mainnet'];
      const ownerAddress: Address = '0x123' as Address;

      await dataSource.getLinkedIdentitiesByOwnerAddress(chains, ownerAddress);

      expect(linkedIdentityQueries.getByOwnerAddress).toHaveBeenCalledWith(
        chains,
        ownerAddress,
      );
    });
  });

  describe('getLinkedIdentityById', () => {
    it('should load identity through DataLoader and return result', async () => {
      const chains: DbSchema[] = ['mainnet'];
      const repoId = ((3n << 224n) | 1n).toString() as RepoDriverId;
      const accountId: LinkedIdentityId = repoId as unknown as LinkedIdentityId;
      const mockIdentity: LinkedIdentityDataValues = {
        accountId: repoId,
        ownerAddress: '0x123' as Address,
        identityType: 'orcid',
        ownerAccountId: '1' as AddressDriverId,
        isLinked: true,
        lastProcessedVersion: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        chain: 'mainnet',
      };

      dataSource._batchLinkedIdentitiesByIds.load = vi
        .fn()
        .mockResolvedValue(mockIdentity);

      const result = await dataSource.getLinkedIdentityById(accountId, chains);

      expect(dataSource._batchLinkedIdentitiesByIds.load).toHaveBeenCalledWith({
        accountId,
        chains,
      });
      expect(result).toEqual(mockIdentity);
    });

    it('should return null when identity is not found', async () => {
      const chains: DbSchema[] = ['mainnet'];
      const repoId = ((3n << 224n) | 1n).toString() as RepoDriverId;
      const accountId: LinkedIdentityId = repoId as unknown as LinkedIdentityId;

      dataSource._batchLinkedIdentitiesByIds.load = vi
        .fn()
        .mockResolvedValue(null);

      const result = await dataSource.getLinkedIdentityById(accountId, chains);

      expect(result).toBeNull();
    });
  });

  describe('_batchLinkedIdentitiesByIds DataLoader', () => {
    it('should batch load identities and map results correctly', async () => {
      const repoId1 = ((3n << 224n) | 1n).toString() as RepoDriverId;
      const repoId2 = ((3n << 224n) | 2n).toString() as RepoDriverId;

      const identityKeys: LinkedIdentityMultiChainKey[] = [
        {
          accountId: repoId1 as unknown as LinkedIdentityId,
          chains: ['mainnet'],
        },
        {
          accountId: repoId2 as unknown as LinkedIdentityId,
          chains: ['mainnet'],
        },
      ];

      const mockParsedResult = {
        chains: ['mainnet'],
        ids: [repoId1, repoId2],
      };

      const mockDbResults: LinkedIdentityDataValues[] = [
        {
          accountId: repoId1,
          ownerAddress: '0x123' as Address,
          identityType: 'orcid',
          ownerAccountId: '1' as AddressDriverId,
          isLinked: true,
          lastProcessedVersion: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
          chain: 'mainnet',
        },
        {
          accountId: repoId2,
          ownerAddress: '0x456' as Address,
          identityType: 'orcid',
          ownerAccountId: '2' as AddressDriverId,
          isLinked: true,
          lastProcessedVersion: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
          chain: 'mainnet',
        },
      ];

      (parseMultiChainKeys as any).mockReturnValue(mockParsedResult);
      (linkedIdentityQueries.getByIds as any).mockResolvedValue(mockDbResults);

      const result = await (
        dataSource as any
      )._batchLinkedIdentitiesByIds.loadMany(identityKeys);

      expect(parseMultiChainKeys).toHaveBeenCalledWith(identityKeys);
      expect(linkedIdentityQueries.getByIds).toHaveBeenCalledWith(
        mockParsedResult.chains,
        mockParsedResult.ids,
      );
      expect(result).toEqual(mockDbResults);
    });

    it('should return undefined for identities not found in batch', async () => {
      const repoId1 = ((3n << 224n) | 1n).toString() as RepoDriverId;
      const repoId2 = ((3n << 224n) | 2n).toString() as RepoDriverId;

      const identityKeys: LinkedIdentityMultiChainKey[] = [
        {
          accountId: repoId1 as unknown as LinkedIdentityId,
          chains: ['mainnet'],
        },
        {
          accountId: repoId2 as unknown as LinkedIdentityId,
          chains: ['mainnet'],
        },
      ];

      const mockParsedResult = {
        chains: ['mainnet'],
        ids: [repoId1, repoId2],
      };

      const mockDbResults: LinkedIdentityDataValues[] = [
        {
          accountId: repoId1,
          ownerAddress: '0x123' as Address,
          identityType: 'orcid',
          ownerAccountId: '1' as AddressDriverId,
          isLinked: true,
          lastProcessedVersion: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
          chain: 'mainnet',
        },
      ];

      (parseMultiChainKeys as any).mockReturnValue(mockParsedResult);
      (linkedIdentityQueries.getByIds as any).mockResolvedValue(mockDbResults);

      const results = await (
        dataSource as any
      )._batchLinkedIdentitiesByIds.loadMany(identityKeys);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(mockDbResults[0]);
      expect(results[1]).toBeUndefined();
    });
  });
});
