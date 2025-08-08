import { describe, test, beforeEach, expect, vi } from 'vitest';
import { SupportedChain } from '../../src/generated/graphql';
import LinkedIdentityDataSource from '../../src/dataLoaders/LinkedIdentityDataSource';
import linkedIdentityResolvers, {
  toLinkedIdentity,
} from '../../src/linked-identity/linkedIdentityResolvers';
import type { LinkedIdentityDataValues } from '../../src/linked-identity/LinkedIdentityModel';
import queryableChains from '../../src/common/queryableChains';
import { chainToDbSchema } from '../../src/utils/chainSchemaMappings';
import type {
  Address,
  RepoDriverId,
  AddressDriverId,
} from '../../src/common/types';

describe('linkedIdentityResolvers', () => {
  let dataSource: LinkedIdentityDataSource;

  beforeEach(() => {
    vi.clearAllMocks();

    dataSource = new LinkedIdentityDataSource();
    dataSource.getLinkedIdentitiesByOwnerAddress = vi.fn();
  });

  describe('linkedIdentitiesByOwner', () => {
    test('should pass owner address and chains to data source', async () => {
      const args = {
        ownerAddress: '0x1234567890123456789012345678901234567890',
        chains: [SupportedChain.MAINNET, SupportedChain.SEPOLIA],
      };

      const mockDataValues: LinkedIdentityDataValues[] = [];
      (dataSource.getLinkedIdentitiesByOwnerAddress as any).mockResolvedValue(
        mockDataValues,
      );

      await linkedIdentityResolvers.Query.linkedIdentitiesByOwner(
        undefined,
        args,
        {
          dataSources: {
            linkedIdentitiesDataSource: dataSource,
          } as any,
        },
      );

      expect(dataSource.getLinkedIdentitiesByOwnerAddress).toHaveBeenCalledWith(
        ['mainnet', 'sepolia'],
        args.ownerAddress,
      );
    });

    test('should use all queryable chains when chains not provided', async () => {
      const args = {
        ownerAddress: '0x1234567890123456789012345678901234567890',
      };

      const mockDataValues: LinkedIdentityDataValues[] = [];
      (dataSource.getLinkedIdentitiesByOwnerAddress as any).mockResolvedValue(
        mockDataValues,
      );

      await linkedIdentityResolvers.Query.linkedIdentitiesByOwner(
        undefined,
        args,
        {
          dataSources: {
            linkedIdentitiesDataSource: dataSource,
          } as any,
        },
      );

      const expectedDbSchemas = queryableChains.map(
        (chain) => chainToDbSchema[chain],
      );
      expect(dataSource.getLinkedIdentitiesByOwnerAddress).toHaveBeenCalledWith(
        expectedDbSchemas,
        args.ownerAddress,
      );
    });

    test('should handle empty chains array', async () => {
      const args = {
        ownerAddress: '0x1234567890123456789012345678901234567890',
        chains: [] as SupportedChain[],
      };

      const mockDataValues: LinkedIdentityDataValues[] = [];
      (dataSource.getLinkedIdentitiesByOwnerAddress as any).mockResolvedValue(
        mockDataValues,
      );

      await linkedIdentityResolvers.Query.linkedIdentitiesByOwner(
        undefined,
        args,
        {
          dataSources: {
            linkedIdentitiesDataSource: dataSource,
          } as any,
        },
      );

      const expectedDbSchemas = queryableChains.map(
        (chain) => chainToDbSchema[chain],
      );
      expect(dataSource.getLinkedIdentitiesByOwnerAddress).toHaveBeenCalledWith(
        expectedDbSchemas,
        args.ownerAddress,
      );
    });

    test('should group identities by accountId and convert to LinkedIdentity objects', async () => {
      const mockDataValues: LinkedIdentityDataValues[] = [
        {
          accountId: 'account1' as RepoDriverId,
          identityType: 'orcid',
          ownerAddress: '0x1234567890123456789012345678901234567890' as Address,
          ownerAccountId: 'address1' as AddressDriverId,
          isLinked: true,
          lastProcessedVersion: '1.0',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-02'),
          chain: 'mainnet' as any,
        },
        {
          accountId: 'account1' as RepoDriverId,
          identityType: 'orcid',
          ownerAddress: '0x1234567890123456789012345678901234567890' as Address,
          ownerAccountId: 'address1' as AddressDriverId,
          isLinked: false,
          lastProcessedVersion: '1.0',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-02'),
          chain: 'sepolia' as any,
        },
        {
          accountId: 'account2' as RepoDriverId,
          identityType: 'orcid',
          ownerAddress: '0x1234567890123456789012345678901234567890' as Address,
          ownerAccountId: 'address2' as AddressDriverId,
          isLinked: true,
          lastProcessedVersion: '1.0',
          createdAt: new Date('2023-01-03'),
          updatedAt: new Date('2023-01-04'),
          chain: 'mainnet' as any,
        },
      ];

      (dataSource.getLinkedIdentitiesByOwnerAddress as any).mockResolvedValue(
        mockDataValues,
      );

      const result =
        await linkedIdentityResolvers.Query.linkedIdentitiesByOwner(
          undefined,
          { ownerAddress: '0x1234567890123456789012345678901234567890' },
          {
            dataSources: {
              linkedIdentitiesDataSource: dataSource,
            } as any,
          },
        );

      expect(result).toHaveLength(2); // Two unique accountIds
      expect(result[0].account.accountId).toBe('account1');
      expect(result[0].chainData).toHaveLength(2); // Two chains for account1
      expect(result[1].account.accountId).toBe('account2');
      expect(result[1].chainData).toHaveLength(1); // One chain for account2
    });

    test('should return empty array when no identities found', async () => {
      (dataSource.getLinkedIdentitiesByOwnerAddress as any).mockResolvedValue(
        [],
      );

      const result =
        await linkedIdentityResolvers.Query.linkedIdentitiesByOwner(
          undefined,
          { ownerAddress: '0x1234567890123456789012345678901234567890' },
          {
            dataSources: {
              linkedIdentitiesDataSource: dataSource,
            } as any,
          },
        );

      expect(result).toEqual([]);
    });
  });

  describe('toLinkedIdentity', () => {
    test('should convert LinkedIdentityDataValues to LinkedIdentity', () => {
      const mockDataValues: LinkedIdentityDataValues[] = [
        {
          accountId: 'account1' as RepoDriverId,
          identityType: 'orcid',
          ownerAddress: '0x1234567890123456789012345678901234567890' as Address,
          ownerAccountId: 'address1' as AddressDriverId,
          isLinked: true,
          lastProcessedVersion: '1.0',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-02'),
          chain: 'mainnet' as any,
        },
        {
          accountId: 'account1' as RepoDriverId,
          identityType: 'orcid',
          ownerAddress: '0x1234567890123456789012345678901234567890' as Address,
          ownerAccountId: 'address1' as AddressDriverId,
          isLinked: false,
          lastProcessedVersion: '1.0',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-02'),
          chain: 'sepolia' as any,
        },
      ];

      const result = toLinkedIdentity(mockDataValues);

      expect(result).toEqual({
        account: {
          driver: 'REPO',
          accountId: 'account1',
        },
        chainData: [
          {
            chain: 'MAINNET',
            identityType: 'ORCID',
            owner: {
              driver: 'ADDRESS',
              accountId: 'address1',
              address: '0x1234567890123456789012345678901234567890',
            },
            isLinked: true,
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-02'),
          },
          {
            chain: 'SEPOLIA',
            identityType: 'ORCID',
            owner: {
              driver: 'ADDRESS',
              accountId: 'address1',
              address: '0x1234567890123456789012345678901234567890',
            },
            isLinked: false,
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-02'),
          },
        ],
      });
    });

    test('should return null for empty data values', () => {
      const result = toLinkedIdentity([]);
      expect(result).toBeNull();
    });
  });
});
