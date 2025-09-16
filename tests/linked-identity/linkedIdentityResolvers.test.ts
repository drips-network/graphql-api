/* eslint-disable no-bitwise */

import { describe, test, beforeEach, expect, vi } from 'vitest';
import type { LinkedIdentity as GqlLinkedIdentity } from '../../src/generated/graphql';
import {
  LinkedIdentitySortField,
  LinkedIdentityTypeField,
  SortDirection,
  SupportedChain,
} from '../../src/generated/graphql';
import LinkedIdentityDataSource from '../../src/dataLoaders/LinkedIdentityDataSource';
import linkedIdentityResolvers from '../../src/linked-identity/linkedIdentityResolvers';
import type {
  RepoDriverId,
  AddressDriverId,
  LinkedIdentityId,
  Address,
} from '../../src/common/types';
import toGqlLinkedIdentity from '../../src/linked-identity/linkedIdentityUtils';
import validateLinkedIdentitiesInput from '../../src/linked-identity/linkedIdentityValidators';
import { validateChainsQueryArg } from '../../src/utils/commonInputValidators';
import * as assertUtils from '../../src/utils/assert';
import validateOrcidExists from '../../src/orcid-account/validateOrcidExists';
import { getCrossChainOrcidAccountIdByAddress } from '../../src/common/dripsContracts';

vi.mock('../../src/linked-identity/linkedIdentityUtils');
vi.mock('../../src/linked-identity/linkedIdentityValidators');
vi.mock('../../src/utils/commonInputValidators');
vi.mock('../../src/utils/assert');
vi.mock('../../src/orcid-account/validateOrcidExists');
vi.mock('../../src/common/dripsContracts');
vi.mock('../../src/orcid-account/orcidAccountIdUtils');

describe('linkedIdentityResolvers', () => {
  let dataSource: LinkedIdentityDataSource;

  beforeEach(() => {
    vi.clearAllMocks();

    dataSource = new LinkedIdentityDataSource();
    dataSource.getLinkedIdentitiesByFilter = vi.fn();
    dataSource.getLinkedIdentityById = vi.fn();
  });

  describe('Query.linkedIdentities', () => {
    test('should return the expected result', async () => {
      const args = {
        chains: [SupportedChain.MAINNET],
        where: { type: LinkedIdentityTypeField.orcid },
        sort: {
          direction: SortDirection.DESC,
          field: LinkedIdentitySortField.createdAt,
        },
        limit: 50,
      };

      const mockDbIdentity = {
        accountId: ((3n << 224n) | 123n).toString() as RepoDriverId,
        ownerAddress: '0x123' as Address,
        identityType: 'orcid' as const,
        ownerAccountId: '1' as AddressDriverId,
        areSplitsValid: true,
        lastProcessedVersion: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        chain: 'mainnet' as const,
      };

      const expectedGqlIdentity = {} as GqlLinkedIdentity;

      vi.mocked(dataSource.getLinkedIdentitiesByFilter).mockResolvedValue([
        mockDbIdentity,
      ]);
      vi.mocked(toGqlLinkedIdentity).mockReturnValue(expectedGqlIdentity);

      const result = await linkedIdentityResolvers.Query.linkedIdentities(
        undefined,
        args,
        {
          dataSources: {
            linkedIdentitiesDataSource: dataSource,
          } as any,
        },
      );

      expect(validateLinkedIdentitiesInput).toHaveBeenCalledWith(args);

      expect(dataSource.getLinkedIdentitiesByFilter).toHaveBeenCalledWith(
        ['mainnet'],
        args.where,
        args.sort,
        args.limit,
      );

      expect(toGqlLinkedIdentity).toHaveBeenCalledWith(mockDbIdentity, 0, [
        mockDbIdentity,
      ]);

      expect(result).toEqual([expectedGqlIdentity]);
    });
  });

  describe('Query.linkedIdentityById', () => {
    test('should return the expected result', async () => {
      const repoId = ((3n << 224n) | 123n).toString() as RepoDriverId;
      const linkedIdentityId = repoId as unknown as LinkedIdentityId;
      const args = {
        id: linkedIdentityId,
        chain: SupportedChain.MAINNET,
      };

      const mockDbIdentity = {
        accountId: ((3n << 224n) | 123n).toString() as RepoDriverId,
        ownerAddress: '0x123' as Address,
        identityType: 'orcid' as const,
        ownerAccountId: '1' as AddressDriverId,
        areSplitsValid: true,
        lastProcessedVersion: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        chain: 'mainnet' as const,
      };

      const expectedGqlIdentity = {} as GqlLinkedIdentity;

      vi.mocked(assertUtils.isLinkedIdentityId).mockReturnValue(true);
      vi.mocked(dataSource.getLinkedIdentityById).mockResolvedValue(
        mockDbIdentity,
      );
      vi.mocked(toGqlLinkedIdentity).mockReturnValue(
        expectedGqlIdentity as any,
      );

      const result = await linkedIdentityResolvers.Query.linkedIdentityById(
        undefined,
        args,
        {
          dataSources: {
            linkedIdentitiesDataSource: dataSource,
          } as any,
        },
      );

      expect(validateChainsQueryArg).toHaveBeenCalledWith([args.chain]);

      expect(dataSource.getLinkedIdentityById).toHaveBeenCalledWith(
        linkedIdentityId,
        ['mainnet'],
      );

      expect(toGqlLinkedIdentity).toHaveBeenCalledWith(mockDbIdentity);

      expect(result).toEqual(expectedGqlIdentity);
    });
  });

  describe('Query.orcidLinkedIdentityByOrcid', () => {
    test('should return the expected result', async () => {
      const orcid = '0000-0002-1825-0097';
      const repoId = ((3n << 224n) | 123n).toString() as RepoDriverId;
      const linkedIdentityId = repoId as unknown as LinkedIdentityId;
      const args = {
        orcid,
        chain: SupportedChain.MAINNET,
      };

      const mockDbIdentity = {
        accountId: ((3n << 224n) | 123n).toString() as RepoDriverId,
        ownerAddress: '0x123' as Address,
        identityType: 'orcid' as const,
        ownerAccountId: '1' as AddressDriverId,
        areSplitsValid: true,
        lastProcessedVersion: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        chain: 'mainnet' as const,
      };

      const expectedGqlIdentity = {} as GqlLinkedIdentity;

      vi.mocked(assertUtils.isOrcidId).mockReturnValue(true);
      vi.mocked(validateOrcidExists).mockResolvedValue(true);
      vi.mocked(getCrossChainOrcidAccountIdByAddress).mockResolvedValue(
        linkedIdentityId as unknown as RepoDriverId,
      );
      vi.mocked(assertUtils.assertIsLinkedIdentityId).mockImplementation(
        () => {}, // eslint-disable-line no-empty-function
      );
      vi.mocked(dataSource.getLinkedIdentityById).mockResolvedValue(
        mockDbIdentity,
      );
      vi.mocked(toGqlLinkedIdentity).mockReturnValue(
        expectedGqlIdentity as any,
      );

      const result =
        await linkedIdentityResolvers.Query.orcidLinkedIdentityByOrcid(
          undefined,
          args,
          {
            dataSources: {
              linkedIdentitiesDataSource: dataSource,
            } as any,
          },
        );

      expect(validateChainsQueryArg).toHaveBeenCalledWith([args.chain]);

      expect(validateOrcidExists).toHaveBeenCalledWith(orcid);

      expect(getCrossChainOrcidAccountIdByAddress).toHaveBeenCalledWith(orcid, [
        'mainnet',
      ]);

      expect(assertUtils.assertIsLinkedIdentityId).toHaveBeenCalledWith(
        linkedIdentityId,
      );

      expect(dataSource.getLinkedIdentityById).toHaveBeenCalledWith(
        linkedIdentityId,
        ['mainnet'],
      );

      expect(toGqlLinkedIdentity).toHaveBeenCalledWith(mockDbIdentity);

      expect(result).toEqual(expectedGqlIdentity);
    });
  });
});
