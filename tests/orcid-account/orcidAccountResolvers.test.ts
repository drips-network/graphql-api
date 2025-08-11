import { describe, test, beforeEach, expect, vi } from 'vitest';
import { SupportedChain } from '../../src/generated/graphql';
import orcidAccountResolvers from '../../src/orcid-account/orcidAccountResolvers';
import LinkedIdentityDataSource from '../../src/dataLoaders/LinkedIdentityDataSource';
import { isOrcidId } from '../../src/utils/assert';
import validateOrcidExists from '../../src/orcid-account/validateOrcidExists';
import { getCrossChainOrcidAccountIdByAddress } from '../../src/common/dripsContracts';

vi.mock('../../src/orcid-account/orcidAccountValidators');
vi.mock('../../src/orcid-account/orcidAccountUtils');
vi.mock('../../src/orcid-account/validateOrcidExists');
vi.mock('../../src/common/dripsContracts');
vi.mock('../../src/utils/assert');

describe('orcidAccountResolvers Query', () => {
  let linkedIdentitiesDataSource: LinkedIdentityDataSource;

  beforeEach(() => {
    vi.clearAllMocks();

    linkedIdentitiesDataSource = new LinkedIdentityDataSource();
    linkedIdentitiesDataSource.getOrcidAccountsByFilter = vi.fn();
    linkedIdentitiesDataSource.getOrcidAccountById = vi.fn();
  });

  describe('orcidAccounts', () => {
    test('should pass chains parameter to data source', async () => {
      const args = {
        chains: [SupportedChain.MAINNET],
      };

      await orcidAccountResolvers.Query.orcidAccounts(undefined, args, {
        dataSources: {
          linkedIdentitiesDataSource,
        } as any,
      });

      expect(
        linkedIdentitiesDataSource.getOrcidAccountsByFilter,
      ).toHaveBeenCalledWith(['mainnet'], undefined, undefined, undefined);
    });

    test('should pass where parameter to data source', async () => {
      const args = {
        chains: [SupportedChain.MAINNET],
        where: { id: { contains: 'test' } },
      };

      await orcidAccountResolvers.Query.orcidAccounts(undefined, args, {
        dataSources: {
          linkedIdentitiesDataSource,
        } as any,
      });

      expect(
        linkedIdentitiesDataSource.getOrcidAccountsByFilter,
      ).toHaveBeenCalledWith(['mainnet'], args.where, undefined, undefined);
    });

    test('should pass sort parameter to data source', async () => {
      const args = {
        chains: [SupportedChain.MAINNET],
        sort: { field: 'createdAt', direction: 'desc' },
      };

      await orcidAccountResolvers.Query.orcidAccounts(undefined, args, {
        dataSources: {
          linkedIdentitiesDataSource,
        } as any,
      });

      expect(
        linkedIdentitiesDataSource.getOrcidAccountsByFilter,
      ).toHaveBeenCalledWith(['mainnet'], undefined, args.sort, undefined);
    });

    test('should pass limit parameter to data source', async () => {
      const args = {
        chains: [SupportedChain.MAINNET],
        limit: 50,
      };

      await orcidAccountResolvers.Query.orcidAccounts(undefined, args, {
        dataSources: {
          linkedIdentitiesDataSource,
        } as any,
      });

      expect(
        linkedIdentitiesDataSource.getOrcidAccountsByFilter,
      ).toHaveBeenCalledWith(['mainnet'], undefined, undefined, args.limit);
    });

    test('should use all queryable chains when no chains provided', async () => {
      const args = {
        chains: [],
      };

      await orcidAccountResolvers.Query.orcidAccounts(undefined, args, {
        dataSources: {
          linkedIdentitiesDataSource,
        } as any,
      });

      expect(
        linkedIdentitiesDataSource.getOrcidAccountsByFilter,
      ).toHaveBeenCalledWith(
        expect.arrayContaining(['mainnet']),
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('orcidAccountById', () => {
    test('should throw error for invalid ORCID ID', async () => {
      vi.mocked(isOrcidId).mockReturnValue(false);

      const args = {
        id: 'invalid-id',
        chains: [SupportedChain.MAINNET],
      };

      await expect(
        orcidAccountResolvers.Query.orcidAccountById(undefined, args, {
          dataSources: {
            linkedIdentitiesDataSource,
          } as any,
        }),
      ).rejects.toThrow(
        "Invalid ORCID identifier: 'invalid-id'. Expected format: 0000-0000-0000-000X",
      );
    });

    test('should return null when ORCID does not exist', async () => {
      vi.mocked(isOrcidId).mockReturnValue(true);
      vi.mocked(validateOrcidExists).mockResolvedValue(false);

      const args = {
        id: '0000-0000-0000-0000',
        chains: [SupportedChain.MAINNET],
      };

      const result = await orcidAccountResolvers.Query.orcidAccountById(
        undefined,
        args,
        {
          dataSources: {
            linkedIdentitiesDataSource,
          } as any,
        },
      );

      expect(result).toBeNull();
    });

    test('should call data source with correct parameters', async () => {
      vi.mocked(isOrcidId).mockReturnValue(true);
      vi.mocked(validateOrcidExists).mockResolvedValue(true);
      vi.mocked(getCrossChainOrcidAccountIdByAddress).mockResolvedValue('123');

      linkedIdentitiesDataSource.getOrcidAccountById = vi
        .fn()
        .mockResolvedValue(null);

      const args = {
        id: '0000-0000-0000-0000',
        chains: [SupportedChain.MAINNET],
      };

      await orcidAccountResolvers.Query.orcidAccountById(undefined, args, {
        dataSources: {
          linkedIdentitiesDataSource,
        } as any,
      });

      expect(
        linkedIdentitiesDataSource.getOrcidAccountById,
      ).toHaveBeenCalledWith('123', ['mainnet']);
    });

    test('should use all queryable chains when no chains provided', async () => {
      vi.mocked(isOrcidId).mockReturnValue(true);
      vi.mocked(validateOrcidExists).mockResolvedValue(true);
      vi.mocked(getCrossChainOrcidAccountIdByAddress).mockResolvedValue('123');

      linkedIdentitiesDataSource.getOrcidAccountById = vi
        .fn()
        .mockResolvedValue(null);

      const args = {
        id: '0000-0000-0000-0000',
      };

      await orcidAccountResolvers.Query.orcidAccountById(undefined, args, {
        dataSources: {
          linkedIdentitiesDataSource,
        } as any,
      });

      expect(
        linkedIdentitiesDataSource.getOrcidAccountById,
      ).toHaveBeenCalledWith('123', expect.arrayContaining(['mainnet']));
    });
  });
});
