import { describe, test, expect, vi, beforeEach } from 'vitest';
import linkedIdentityQueries from '../../../src/dataLoaders/sqlQueries/linkedIdentityQueries';
import { dbConnection } from '../../../src/database/connectToDatabase';
import type { LinkedIdentityDataValues } from '../../../src/linked-identity/LinkedIdentityModel';
import type {
  RepoDriverId,
  Address,
  AddressDriverId,
} from '../../../src/common/types';
import {
  LinkedIdentityTypeField,
  LinkedIdentitySortField,
  SortDirection,
} from '../../../src/generated/graphql';

vi.mock('../../../src/database/connectToDatabase');

describe('linkedIdentityQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getByIds', () => {
    test('should return linked identities for single chain and single account ID', async () => {
      const mockResult = [
        {
          dataValues: {
            accountId: 'test-account-1' as RepoDriverId,
            identityType: 'orcid' as const,
            ownerAddress: '0x123' as Address,
            ownerAccountId: 'owner-1' as AddressDriverId,
            areSplitsValid: true,
            lastProcessedVersion: '1.0.0',
            createdAt: new Date(),
            updatedAt: new Date(),
            chain: 'mainnet' as const,
          } as LinkedIdentityDataValues,
        },
      ];

      vi.mocked(dbConnection.query).mockResolvedValueOnce(mockResult as any);

      const result = await linkedIdentityQueries.getByIds(
        ['mainnet'],
        ['test-account-1' as RepoDriverId],
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        accountId: 'test-account-1',
        identityType: 'orcid',
        ownerAddress: '0x123',
        chain: 'mainnet',
      });

      expect(dbConnection.query).toHaveBeenCalledTimes(1);
      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT *, 'mainnet' AS chain FROM mainnet.linked_identities",
        ),
        expect.objectContaining({
          replacements: { accountIds: ['test-account-1' as RepoDriverId] },
        }),
      );
    });

    test('should return linked identities for multiple chains and account IDs', async () => {
      const mockResult = [
        {
          dataValues: {
            accountId: 'test-account-1' as RepoDriverId,
            identityType: 'orcid' as const,
            ownerAddress: '0x123' as Address,
            ownerAccountId: 'owner-1' as AddressDriverId,
            areSplitsValid: true,
            lastProcessedVersion: '1.0.0',
            createdAt: new Date(),
            updatedAt: new Date(),
            chain: 'mainnet' as const,
          } as LinkedIdentityDataValues,
        },
        {
          dataValues: {
            accountId: 'test-account-2' as RepoDriverId,
            identityType: 'orcid' as const,
            ownerAddress: '0x456' as Address,
            ownerAccountId: 'owner-2' as AddressDriverId,
            areSplitsValid: true,
            lastProcessedVersion: '1.0.0',
            createdAt: new Date(),
            updatedAt: new Date(),
            chain: 'sepolia' as const,
          } as LinkedIdentityDataValues,
        },
      ];

      vi.mocked(dbConnection.query).mockResolvedValueOnce(mockResult as any);

      const result = await linkedIdentityQueries.getByIds(
        ['mainnet', 'sepolia'],
        ['test-account-1' as RepoDriverId, 'test-account-2' as RepoDriverId],
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        accountId: 'test-account-1',
        identityType: 'orcid',
        ownerAddress: '0x123',
        chain: 'mainnet',
      });
      expect(result[1]).toMatchObject({
        accountId: 'test-account-2',
        identityType: 'orcid',
        ownerAddress: '0x456',
        chain: 'sepolia',
      });

      expect(dbConnection.query).toHaveBeenCalledTimes(1);
      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT *, \'mainnet\' AS chain FROM mainnet.linked_identities WHERE "account_id" IN (:accountIds) UNION SELECT *, \'sepolia\' AS chain FROM sepolia.linked_identities WHERE "account_id" IN (:accountIds) LIMIT 1000',
        ),
        expect.objectContaining({
          replacements: {
            accountIds: [
              'test-account-1' as RepoDriverId,
              'test-account-2' as RepoDriverId,
            ],
          },
        }),
      );
    });

    test('should handle empty account IDs array', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      const result = await linkedIdentityQueries.getByIds(
        ['mainnet'],
        [] as RepoDriverId[],
      );

      expect(result).toEqual([]);
      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE "account_id" IN (:accountIds)'),
        expect.objectContaining({
          replacements: { accountIds: [] as RepoDriverId[] },
        }),
      );
    });

    test('should apply LIMIT 1000', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getByIds(
        ['mainnet'],
        ['test-account-1' as RepoDriverId],
      );

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1000'),
        expect.anything(),
      );
    });

    test('should use correct SQL query structure with UNION for multiple chains', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getByIds(
        ['mainnet', 'sepolia', 'polygon_amoy'],
        ['test-account-1' as RepoDriverId],
      );

      const query = vi.mocked(dbConnection.query).mock.calls[0][0] as string;

      expect(query).toContain(
        "SELECT *, 'mainnet' AS chain FROM mainnet.linked_identities",
      );
      expect(query).toContain(
        "SELECT *, 'sepolia' AS chain FROM sepolia.linked_identities",
      );
      expect(query).toContain(
        "SELECT *, 'polygon_amoy' AS chain FROM polygon_amoy.linked_identities",
      );
      expect(query).toContain('UNION');
      expect(query).toContain('WHERE "account_id" IN (:accountIds)');
    });
  });

  describe('getByOwnerAddress', () => {
    test('should return linked identities for single chain and owner address', async () => {
      const mockResult = [
        {
          dataValues: {
            accountId: 'test-account-1' as RepoDriverId,
            identityType: 'orcid' as const,
            ownerAddress: '0x123' as Address,
            ownerAccountId: 'owner-1' as AddressDriverId,
            areSplitsValid: true,
            lastProcessedVersion: '1.0.0',
            createdAt: new Date(),
            updatedAt: new Date(),
            chain: 'mainnet' as const,
          } as LinkedIdentityDataValues,
        },
      ];

      vi.mocked(dbConnection.query).mockResolvedValueOnce(mockResult as any);

      const result = await linkedIdentityQueries.getByOwnerAddress(
        ['mainnet'],
        '0x123' as Address,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        accountId: 'test-account-1',
        identityType: 'orcid',
        ownerAddress: '0x123',
        chain: 'mainnet',
      });

      expect(dbConnection.query).toHaveBeenCalledTimes(1);
      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT *, 'mainnet' AS chain FROM mainnet.linked_identities",
        ),
        expect.objectContaining({
          replacements: { ownerAddress: '0x123' as Address },
        }),
      );
    });

    test('should return linked identities for multiple chains', async () => {
      const mockResult = [
        {
          dataValues: {
            accountId: 'test-account-1' as RepoDriverId,
            identityType: 'orcid' as const,
            ownerAddress: '0x123' as Address,
            ownerAccountId: 'owner-1' as AddressDriverId,
            areSplitsValid: true,
            lastProcessedVersion: '1.0.0',
            createdAt: new Date(),
            updatedAt: new Date(),
            chain: 'mainnet' as const,
          } as LinkedIdentityDataValues,
        },
        {
          dataValues: {
            accountId: 'test-account-2' as RepoDriverId,
            identityType: 'orcid' as const,
            ownerAddress: '0x123' as Address,
            ownerAccountId: 'owner-2' as AddressDriverId,
            areSplitsValid: true,
            lastProcessedVersion: '1.0.0',
            createdAt: new Date(),
            updatedAt: new Date(),
            chain: 'sepolia' as const,
          } as LinkedIdentityDataValues,
        },
      ];

      vi.mocked(dbConnection.query).mockResolvedValueOnce(mockResult as any);

      const result = await linkedIdentityQueries.getByOwnerAddress(
        ['mainnet', 'sepolia'],
        '0x123' as Address,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        accountId: 'test-account-1',
        identityType: 'orcid',
        ownerAddress: '0x123',
        chain: 'mainnet',
      });
      expect(result[1]).toMatchObject({
        accountId: 'test-account-2',
        identityType: 'orcid',
        ownerAddress: '0x123',
        chain: 'sepolia',
      });

      expect(dbConnection.query).toHaveBeenCalledTimes(1);
      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT *, \'mainnet\' AS chain FROM mainnet.linked_identities WHERE "owner_address" = :ownerAddress UNION SELECT *, \'sepolia\' AS chain FROM sepolia.linked_identities WHERE "owner_address" = :ownerAddress LIMIT 1000',
        ),
        expect.objectContaining({
          replacements: { ownerAddress: '0x123' as Address },
        }),
      );
    });

    test('should handle case-sensitive owner address matching', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getByOwnerAddress(
        ['mainnet'],
        '0xABC123' as Address,
      );

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE "owner_address" = :ownerAddress'),
        expect.objectContaining({
          replacements: { ownerAddress: '0xABC123' as Address },
        }),
      );
    });

    test('should apply LIMIT 1000', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getByOwnerAddress(
        ['mainnet'],
        '0x123' as Address,
      );

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1000'),
        expect.anything(),
      );
    });

    test('should use correct SQL query structure with UNION for multiple chains', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getByOwnerAddress(
        ['mainnet', 'sepolia', 'polygon_amoy'],
        '0x123' as Address,
      );

      const query = vi.mocked(dbConnection.query).mock.calls[0][0] as string;

      expect(query).toContain(
        "SELECT *, 'mainnet' AS chain FROM mainnet.linked_identities",
      );
      expect(query).toContain(
        "SELECT *, 'sepolia' AS chain FROM sepolia.linked_identities",
      );
      expect(query).toContain(
        "SELECT *, 'polygon_amoy' AS chain FROM polygon_amoy.linked_identities",
      );
      expect(query).toContain('UNION');
      expect(query).toContain('WHERE "owner_address" = :ownerAddress');
    });

    test('should handle empty result set', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      const result = await linkedIdentityQueries.getByOwnerAddress(
        ['mainnet'],
        '0xNonExistent' as Address,
      );

      expect(result).toEqual([]);
    });
  });

  describe('getByIds (ORCID filtering)', () => {
    test('should return ORCID account for given account ID', async () => {
      const mockResult = [
        {
          dataValues: {
            accountId: 'orcid-account-1' as RepoDriverId,
            identityType: 'orcid' as const,
            ownerAddress: '0x123' as Address,
            ownerAccountId: 'owner-1' as AddressDriverId,
            areSplitsValid: true,
            lastProcessedVersion: '1.0.0',
            createdAt: new Date(),
            updatedAt: new Date(),
            chain: 'mainnet' as const,
          } as LinkedIdentityDataValues,
        },
      ];

      vi.mocked(dbConnection.query).mockResolvedValueOnce(mockResult as any);

      const result = await linkedIdentityQueries.getByIds(
        ['mainnet'],
        ['orcid-account-1' as RepoDriverId],
      );

      const orcidResult = result.filter(
        (identity) => identity.identityType === 'orcid',
      );

      expect(orcidResult).toHaveLength(1);
      expect(orcidResult[0]).toMatchObject({
        accountId: 'orcid-account-1',
        identityType: 'orcid',
        ownerAddress: '0x123',
        chain: 'mainnet',
      });

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE "account_id" IN (:accountIds)'),
        expect.objectContaining({
          replacements: { accountIds: ['orcid-account-1'] },
        }),
      );
    });

    test('should return empty when no ORCID account found', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      const result = await linkedIdentityQueries.getByIds(
        ['mainnet'],
        ['non-existent' as RepoDriverId],
      );

      expect(result).toHaveLength(0);
    });

    test('should search across multiple chains', async () => {
      const mockResult = [
        {
          dataValues: {
            accountId: 'orcid-account-1' as RepoDriverId,
            identityType: 'orcid' as const,
            ownerAddress: '0x123' as Address,
            ownerAccountId: 'owner-1' as AddressDriverId,
            areSplitsValid: true,
            lastProcessedVersion: '1.0.0',
            createdAt: new Date(),
            updatedAt: new Date(),
            chain: 'sepolia' as const,
          } as LinkedIdentityDataValues,
        },
      ];

      vi.mocked(dbConnection.query).mockResolvedValueOnce(mockResult as any);

      const result = await linkedIdentityQueries.getByIds(
        ['mainnet', 'sepolia', 'polygon_amoy'],
        ['orcid-account-1' as RepoDriverId],
      );

      expect(result).toHaveLength(1);

      const query = vi.mocked(dbConnection.query).mock.calls[0][0] as string;
      expect(query).toContain(
        "SELECT *, 'mainnet' AS chain FROM mainnet.linked_identities",
      );
      expect(query).toContain(
        "SELECT *, 'sepolia' AS chain FROM sepolia.linked_identities",
      );
      expect(query).toContain(
        "SELECT *, 'polygon_amoy' AS chain FROM polygon_amoy.linked_identities",
      );
      expect(query).toContain('UNION');
    });

    test('should apply LIMIT 1000', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getByIds(
        ['mainnet'],
        ['test-account' as RepoDriverId],
      );

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1000'),
        expect.anything(),
      );
    });
  });

  describe('getLinkedIdentitiesByFilter (ORCID filtering)', () => {
    test('should return ORCID accounts without additional filters', async () => {
      const mockResult = [
        {
          dataValues: {
            accountId: 'orcid-1' as RepoDriverId,
            identityType: 'orcid' as const,
            ownerAddress: '0x123' as Address,
            ownerAccountId: 'owner-1' as AddressDriverId,
            areSplitsValid: true,
            lastProcessedVersion: '1.0.0',
            createdAt: new Date(),
            updatedAt: new Date(),
            chain: 'mainnet' as const,
          } as LinkedIdentityDataValues,
        },
      ];

      vi.mocked(dbConnection.query).mockResolvedValueOnce(mockResult as any);

      const result = await linkedIdentityQueries.getLinkedIdentitiesByFilter(
        ['mainnet'],
        { type: LinkedIdentityTypeField.orcid },
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        accountId: 'orcid-1',
        identityType: 'orcid',
      });

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE "identity_type" = :identityType'),
        expect.objectContaining({
          replacements: { limit: 100, identityType: 'orcid' },
        }),
      );
    });

    test('should filter by accountId', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getLinkedIdentitiesByFilter(['mainnet'], {
        type: LinkedIdentityTypeField.orcid,
        accountId: 'orcid-1' as RepoDriverId,
      });

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('AND "account_id" = :accountId'),
        expect.objectContaining({
          replacements: {
            limit: 100,
            identityType: 'orcid',
            accountId: 'orcid-1' as RepoDriverId,
          },
        }),
      );
    });

    test('should filter by ownerAddress', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getLinkedIdentitiesByFilter(['mainnet'], {
        type: LinkedIdentityTypeField.orcid,
        ownerAddress: '0x123' as Address,
      });

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('AND "owner_address" = :ownerAddress'),
        expect.objectContaining({
          replacements: {
            limit: 100,
            identityType: 'orcid',
            ownerAddress: '0x123' as Address,
          },
        }),
      );
    });

    test('should filter by areSplitsValid true', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getLinkedIdentitiesByFilter(['mainnet'], {
        type: LinkedIdentityTypeField.orcid,
        areSplitsValid: true,
      });

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('AND "areSplitsValid" = :areSplitsValid'),
        expect.objectContaining({
          replacements: {
            limit: 100,
            identityType: 'orcid',
            areSplitsValid: true,
          },
        }),
      );
    });

    test('should filter by areSplitsValid false', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getLinkedIdentitiesByFilter(['mainnet'], {
        type: LinkedIdentityTypeField.orcid,
        areSplitsValid: false,
      });

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('AND "areSplitsValid" = :areSplitsValid'),
        expect.objectContaining({
          replacements: {
            limit: 100,
            identityType: 'orcid',
            areSplitsValid: false,
          },
        }),
      );
    });

    test('should apply multiple filters together', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getLinkedIdentitiesByFilter(['mainnet'], {
        type: LinkedIdentityTypeField.orcid,
        accountId: 'orcid-1' as RepoDriverId,
        ownerAddress: '0x123' as Address,
        areSplitsValid: true,
      });

      const query = vi.mocked(dbConnection.query).mock.calls[0][0] as string;
      expect(query).toContain('WHERE "identity_type" = :identityType');
      expect(query).toContain('AND "account_id" = :accountId');
      expect(query).toContain('AND "owner_address" = :ownerAddress');
      expect(query).toContain('AND "areSplitsValid" = :areSplitsValid');

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          replacements: {
            limit: 100,
            identityType: 'orcid',
            accountId: 'orcid-1' as RepoDriverId,
            ownerAddress: '0x123' as Address,
            areSplitsValid: true,
          },
        }),
      );
    });

    test('should sort by createdAt ASC', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getLinkedIdentitiesByFilter(
        ['mainnet'],
        { type: LinkedIdentityTypeField.orcid },
        {
          field: LinkedIdentitySortField.createdAt,
          direction: SortDirection.ASC,
        },
      );

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY "created_at" ASC'),
        expect.anything(),
      );
    });

    test('should sort by createdAt DESC', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getLinkedIdentitiesByFilter(
        ['mainnet'],
        { type: LinkedIdentityTypeField.orcid },
        {
          field: LinkedIdentitySortField.createdAt,
          direction: SortDirection.DESC,
        },
      );

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY "created_at" DESC'),
        expect.anything(),
      );
    });

    test('should default sort direction to ASC when not specified', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getLinkedIdentitiesByFilter(
        ['mainnet'],
        { type: LinkedIdentityTypeField.orcid },
        { field: LinkedIdentitySortField.createdAt },
      );

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY "created_at" ASC'),
        expect.anything(),
      );
    });

    test('should use custom limit', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getLinkedIdentitiesByFilter(
        ['mainnet'],
        { type: LinkedIdentityTypeField.orcid },
        undefined,
        50,
      );

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT :limit'),
        expect.objectContaining({
          replacements: { limit: 50, identityType: 'orcid' },
        }),
      );
    });

    test('should use default limit of 100', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getLinkedIdentitiesByFilter(['mainnet'], {
        type: 'orcid',
      });

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT :limit'),
        expect.objectContaining({
          replacements: { limit: 100, identityType: 'orcid' },
        }),
      );
    });

    test('should search across multiple chains', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getLinkedIdentitiesByFilter(
        ['mainnet', 'sepolia', 'polygon_amoy'],
        { type: LinkedIdentityTypeField.orcid },
      );

      const query = vi.mocked(dbConnection.query).mock.calls[0][0] as string;
      expect(query).toContain(
        "SELECT *, 'mainnet' AS chain FROM mainnet.linked_identities",
      );
      expect(query).toContain(
        "SELECT *, 'sepolia' AS chain FROM sepolia.linked_identities",
      );
      expect(query).toContain(
        "SELECT *, 'polygon_amoy' AS chain FROM polygon_amoy.linked_identities",
      );
      expect(query).toContain('UNION');
    });

    test('should handle ORDER BY placement after UNION correctly', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getLinkedIdentitiesByFilter(
        ['mainnet', 'sepolia'],
        { type: LinkedIdentityTypeField.orcid },
        {
          field: LinkedIdentitySortField.createdAt,
          direction: SortDirection.DESC,
        },
      );

      const query = vi.mocked(dbConnection.query).mock.calls[0][0] as string;
      const unionIndex = query.lastIndexOf('UNION');
      const orderIndex = query.indexOf('ORDER BY');
      const limitIndex = query.indexOf('LIMIT');

      expect(orderIndex).toBeGreaterThan(unionIndex);
      expect(limitIndex).toBeGreaterThan(orderIndex);
    });
  });

  describe('query configuration', () => {
    test('should use correct Sequelize query options for getByIds', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getByIds(
        ['mainnet'],
        ['test-account-1' as RepoDriverId],
      );

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: expect.anything(),
          replacements: expect.any(Object),
          mapToModel: true,
          model: expect.anything(),
        }),
      );
    });

    test('should use correct Sequelize query options for getByOwnerAddress', async () => {
      vi.mocked(dbConnection.query).mockResolvedValueOnce([] as any);

      await linkedIdentityQueries.getByOwnerAddress(
        ['mainnet'],
        '0x123' as Address,
      );

      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: expect.anything(),
          replacements: expect.any(Object),
          mapToModel: true,
          model: expect.anything(),
        }),
      );
    });
  });
});
