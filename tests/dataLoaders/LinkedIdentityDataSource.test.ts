import { describe, beforeEach, expect, vi, it } from 'vitest';
import LinkedIdentityDataSource from '../../src/dataLoaders/LinkedIdentityDataSource';
import type { LinkedIdentityDataValues } from '../../src/linked-identity/LinkedIdentityModel';
import type {
  RepoDriverId,
  Address,
  DbSchema,
  RepoDriverMultiChainKey,
  AddressDriverId,
} from '../../src/common/types';
import {
  type OrcidAccountWhereInput,
  type OrcidAccountSortInput,
  OrcidAccountSortField,
  SortDirection,
} from '../../src/generated/graphql';
import linkedIdentityQueries from '../../src/dataLoaders/sqlQueries/linkedIdentityQueries';
import parseMultiChainKeys from '../../src/utils/parseMultiChainKeys';

vi.mock('../../src/dataLoaders/sqlQueries/linkedIdentityQueries', () => ({
  default: {
    getByIds: vi.fn(),
    getByOwnerAddress: vi.fn(),
    getOrcidAccountsByFilter: vi.fn(),
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
      const mockResult: LinkedIdentityDataValues[] = [
        {
          accountId: '1' as RepoDriverId,
          ownerAddress,
          identityType: 'orcid',
          ownerAccountId: '1' as AddressDriverId,
          isLinked: true,
          lastProcessedVersion: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
          chain: 'mainnet',
        },
      ];

      (linkedIdentityQueries.getByOwnerAddress as any).mockResolvedValue(
        mockResult,
      );

      const result = await dataSource.getLinkedIdentitiesByOwnerAddress(
        chains,
        ownerAddress,
      );

      expect(linkedIdentityQueries.getByOwnerAddress).toHaveBeenCalledWith(
        chains,
        ownerAddress,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getLinkedIdentityById', () => {
    it('should load identity through DataLoader and return result', async () => {
      const chains: DbSchema[] = ['mainnet'];
      const accountId: RepoDriverId = '1' as RepoDriverId;
      const mockIdentity: LinkedIdentityDataValues = {
        accountId,
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

      const result = await dataSource.getLinkedIdentityById(chains, accountId);

      expect(dataSource._batchLinkedIdentitiesByIds.load).toHaveBeenCalledWith({
        accountId,
        chains,
      });
      expect(result).toEqual(mockIdentity);
    });

    it('should return null when identity is not found', async () => {
      const chains: DbSchema[] = ['mainnet'];
      const accountId: RepoDriverId = '1' as RepoDriverId;

      dataSource._batchLinkedIdentitiesByIds.load = vi
        .fn()
        .mockResolvedValue(null);

      const result = await dataSource.getLinkedIdentityById(chains, accountId);

      expect(result).toBeNull();
    });
  });

  describe('_batchLinkedIdentitiesByIds DataLoader', () => {
    it('should batch load identities and map results correctly', async () => {
      const identityKeys: RepoDriverMultiChainKey[] = [
        { accountId: '1' as RepoDriverId, chains: ['mainnet'] },
        { accountId: '2' as RepoDriverId, chains: ['mainnet'] },
      ];

      const mockParsedResult = {
        chains: ['mainnet'] as DbSchema[],
        ids: ['1', '2'] as RepoDriverId[],
      };

      const mockDbResults: LinkedIdentityDataValues[] = [
        {
          accountId: '1' as RepoDriverId,
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
          accountId: '2' as RepoDriverId,
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

      const result =
        await dataSource._batchLinkedIdentitiesByIds.loadMany(identityKeys);

      expect(parseMultiChainKeys).toHaveBeenCalledWith(identityKeys);
      expect(linkedIdentityQueries.getByIds).toHaveBeenCalledWith(
        ['mainnet'],
        ['1', '2'],
      );
      expect(result).toEqual(mockDbResults);
    });

    it('should return undefined for identities not found in batch', async () => {
      const identityKeys: RepoDriverMultiChainKey[] = [
        { accountId: '1' as RepoDriverId, chains: ['mainnet'] },
        { accountId: '2' as RepoDriverId, chains: ['mainnet'] },
      ];

      const mockParsedResult = {
        chains: ['mainnet'] as DbSchema[],
        ids: ['1', '2'] as RepoDriverId[],
      };

      const mockDbResults: LinkedIdentityDataValues[] = [
        {
          accountId: '1' as RepoDriverId,
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

      const results =
        await dataSource._batchLinkedIdentitiesByIds.loadMany(identityKeys);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(mockDbResults[0]);
      expect(results[1]).toBeUndefined();
    });
  });

  describe('getOrcidAccountsByFilter', () => {
    it('should call linkedIdentityQueries.getOrcidAccountsByFilter with correct parameters', async () => {
      const chains: DbSchema[] = ['mainnet'];
      const where: OrcidAccountWhereInput = { accountId: 'test' };
      const sort: OrcidAccountSortInput = {
        field: OrcidAccountSortField.createdAt,
        direction: SortDirection.DESC,
      };
      const limit = 10;

      await dataSource.getOrcidAccountsByFilter(chains, where, sort, limit);

      expect(
        linkedIdentityQueries.getOrcidAccountsByFilter,
      ).toHaveBeenCalledWith(chains, where, sort, limit);
    });
  });

  describe('getOrcidAccountById', () => {
    it('should load identities through DataLoader and filter for ORCID type', async () => {
      const chains: DbSchema[] = ['mainnet', 'sepolia'];
      const accountId: RepoDriverId = '1' as RepoDriverId;
      const mockResults = [
        {
          accountId,
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
          accountId,
          ownerAddress: '0x123' as Address,
          identityType: 'github',
          ownerAccountId: '1' as AddressDriverId,
          isLinked: true,
          lastProcessedVersion: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
          chain: 'mainnet',
        },
      ];

      dataSource._batchLinkedIdentitiesByIds.loadMany = vi
        .fn()
        .mockResolvedValue(mockResults);

      const result = await dataSource.getOrcidAccountById(accountId, chains);

      expect(
        dataSource._batchLinkedIdentitiesByIds.loadMany,
      ).toHaveBeenCalledWith([
        { accountId, chains: ['mainnet'] },
        { accountId, chains: ['sepolia'] },
      ]);
      expect(result).toHaveLength(1);
      expect(result![0].identityType).toBe('orcid');
    });

    it('should return null when no identities are found', async () => {
      const chains: DbSchema[] = ['mainnet'];
      const accountId: RepoDriverId = '1' as RepoDriverId;

      dataSource._batchLinkedIdentitiesByIds.loadMany = vi
        .fn()
        .mockResolvedValue([]);

      const result = await dataSource.getOrcidAccountById(accountId, chains);

      expect(result).toBeNull();
    });

    it('should return null when no ORCID identities are found', async () => {
      const chains: DbSchema[] = ['mainnet'];
      const accountId: RepoDriverId = '1' as RepoDriverId;
      const mockResults = [
        {
          accountId,
          ownerAddress: '0x123' as Address,
          identityType: 'github',
          ownerAccountId: '1' as AddressDriverId,
          isLinked: true,
          lastProcessedVersion: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
          chain: 'mainnet',
        },
      ];

      dataSource._batchLinkedIdentitiesByIds.loadMany = vi
        .fn()
        .mockResolvedValue(mockResults);

      const result = await dataSource.getOrcidAccountById(accountId, chains);

      expect(result).toBeNull();
    });
  });
});
