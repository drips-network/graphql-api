import { describe, it, expect } from 'vitest';
import {
  toResolverOrcidAccount,
  toResolverOrcidAccounts,
  mergeOrcidAccounts,
} from '../../src/orcid-account/orcidAccountUtils';
import type { LinkedIdentityDataValues } from '../../src/linked-identity/LinkedIdentityModel';
import type {
  DbSchema,
  RepoDriverId,
  AddressDriverId,
  Address,
} from '../../src/common/types';
import { Driver } from '../../src/generated/graphql';

describe('orcidAccountUtils', () => {
  // Valid ORCID account ID
  const validOrcidAccountId =
    '81320912658542974439730181977206773330805723773165208113981035642880' as RepoDriverId;

  const mockLinkedIdentity: LinkedIdentityDataValues = {
    accountId: validOrcidAccountId,
    identityType: 'orcid',
    ownerAddress: '0x1234567890123456789012345678901234567890' as Address,
    ownerAccountId:
      '0x1234567890123456789012345678901234567890' as AddressDriverId,
    isLinked: false,
    lastProcessedVersion: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    chain: 'mainnet' as DbSchema,
  };

  const mockLinkedIdentityWithOwner: LinkedIdentityDataValues = {
    accountId: validOrcidAccountId,
    identityType: 'orcid',
    ownerAddress: '0x1234567890123456789012345678901234567890' as Address,
    ownerAccountId:
      '0x1234567890123456789012345678901234567890' as AddressDriverId,
    isLinked: true,
    lastProcessedVersion: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    chain: 'mainnet' as DbSchema,
  };

  describe('toResolverOrcidAccount', () => {
    it('should convert unclaimed linked identity to resolver ORCID account', () => {
      const chains: DbSchema[] = ['mainnet'];
      const result = toResolverOrcidAccount(chains, mockLinkedIdentity);

      expect(result.source.url).toContain('https://orcid.org/');
      expect(result.account.driver).toBe(Driver.REPO);
      expect(result.account.accountId).toBe(mockLinkedIdentity.accountId);
      expect(result.chainData).toHaveLength(1);
      expect(result.chainData[0].linkedTo).toBeNull();
    });

    it('should convert claimed linked identity to resolver ORCID account', () => {
      const chains: DbSchema[] = ['mainnet'];
      const result = toResolverOrcidAccount(
        chains,
        mockLinkedIdentityWithOwner,
      );

      expect(result.account.driver).toBe(Driver.REPO);
      expect(result.chainData).toHaveLength(1);
      expect(result.chainData[0].linkedTo).not.toBeNull();
      expect(result.chainData[0].linkedTo?.driver).toBe(Driver.ADDRESS);
      expect(result.chainData[0].linkedTo?.accountId).toBe(
        mockLinkedIdentityWithOwner.ownerAccountId,
      );
    });

    it('should handle multiple chains', () => {
      const chains: DbSchema[] = ['mainnet', 'optimism'];
      const result = toResolverOrcidAccount(chains, mockLinkedIdentity);

      expect(result.chainData).toHaveLength(2);
      expect(result.chainData[0].chain).toBe('MAINNET');
      expect(result.chainData[1].chain).toBe('OPTIMISM');
    });
  });

  describe('toResolverOrcidAccounts', () => {
    it('should convert multiple linked identities', () => {
      const chains: DbSchema[] = ['mainnet'];
      const identities = [mockLinkedIdentity, mockLinkedIdentityWithOwner];

      const result = toResolverOrcidAccounts(chains, identities);

      expect(result).toHaveLength(2);
      expect(result[0].chainData[0].linkedTo).toBeNull();
      expect(result[1].chainData[0].linkedTo).not.toBeNull();
    });

    it('should handle empty array', () => {
      const chains: DbSchema[] = ['mainnet'];
      const result = toResolverOrcidAccounts(chains, []);

      expect(result).toHaveLength(0);
    });
  });

  describe('mergeOrcidAccounts', () => {
    it('should merge identities from different chains', () => {
      const identityMainnet: LinkedIdentityDataValues = {
        ...mockLinkedIdentity,
        chain: 'mainnet' as DbSchema,
      };
      const identityOptimism: LinkedIdentityDataValues = {
        ...mockLinkedIdentityWithOwner,
        chain: 'optimism' as DbSchema,
      };

      const chains: DbSchema[] = ['mainnet', 'optimism'];
      const result = mergeOrcidAccounts(
        [identityMainnet, identityOptimism],
        chains,
      );

      expect(result.account.accountId).toBe(identityMainnet.accountId);
      expect(result.chainData).toHaveLength(2);
      expect(result.chainData[0].linkedTo).toBeNull();
      expect(result.chainData[1].linkedTo).not.toBeNull();
    });

    it('should throw error when no identities provided', () => {
      const chains: DbSchema[] = ['mainnet'];

      expect(() => mergeOrcidAccounts([], chains)).toThrow(
        'No linked identities provided for merging',
      );
    });

    it('should handle chains not present in identities', () => {
      const identity: LinkedIdentityDataValues = {
        ...mockLinkedIdentity,
        chain: 'mainnet' as DbSchema,
      };

      const chains: DbSchema[] = ['mainnet', 'optimism', 'sepolia'];
      const result = mergeOrcidAccounts([identity], chains);

      expect(result.chainData).toHaveLength(3);
      expect(result.chainData[0].linkedTo).toBeNull();
      expect(result.chainData[1].linkedTo).toBeNull();
      expect(result.chainData[2].linkedTo).toBeNull();
    });

    it('should use first identity as base for common properties', () => {
      const identity1: LinkedIdentityDataValues = {
        accountId: validOrcidAccountId,
        identityType: 'orcid',
        ownerAddress: '0x1234567890123456789012345678901234567890' as Address,
        ownerAccountId:
          '0x1234567890123456789012345678901234567890' as AddressDriverId,
        isLinked: false,
        lastProcessedVersion: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        chain: 'mainnet' as DbSchema,
      };
      const identity2: LinkedIdentityDataValues = {
        accountId: validOrcidAccountId,
        identityType: 'orcid',
        ownerAddress: '0xABCD' as Address,
        ownerAccountId: '0xABCD' as AddressDriverId,
        isLinked: true,
        lastProcessedVersion: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        chain: 'optimism' as DbSchema,
      };

      const chains: DbSchema[] = ['mainnet', 'optimism'];
      const result = mergeOrcidAccounts([identity1, identity2], chains);

      expect(result.account.accountId).toBe(identity1.accountId);
    });
  });
});
