import { describe, test, expect } from 'vitest';
import toGqlLinkedIdentity from '../../src/linked-identity/linkedIdentityUtils';
import type { LinkedIdentityDataValues } from '../../src/linked-identity/LinkedIdentityModel';
import { Driver } from '../../src/generated/graphql';
import type {
  Address,
  AddressDriverId,
  RepoDriverId,
} from '../../src/common/types';

describe('linkedIdentityUtils', () => {
  describe('toGqlLinkedIdentity', () => {
    test('should convert ORCID linked identity with owner', () => {
      const orcidIdentity: LinkedIdentityDataValues = {
        accountId:
          '81320912658542974439730181977206773330805723773165208113981035642880' as RepoDriverId,
        identityType: 'orcid',
        chain: 'mainnet',
        ownerAccountId: '123' as AddressDriverId,
        ownerAddress: '0x1234567890123456789012345678901234567890' as Address,
        areSplitsValid: true,
        lastProcessedVersion: '1.0.0',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const result = toGqlLinkedIdentity(orcidIdentity);

      expect(result).toEqual({
        chain: 'MAINNET',
        account: {
          driver: Driver.REPO,
          accountId:
            '81320912658542974439730181977206773330805723773165208113981035642880',
        },
        owner: {
          driver: Driver.ADDRESS,
          accountId: '123',
          address: '0x1234567890123456789012345678901234567890',
        },
        areSplitsValid: true,
        isClaimed: true,
        orcid: '0009-0001-5257-5119',
        support: [],
        totalEarned: [],
        withdrawableBalances: [],
      });
    });

    test('should convert ORCID linked identity without owner', () => {
      const orcidIdentity: LinkedIdentityDataValues = {
        accountId:
          '81320912658542974439730181977206773330805723773165208113981035642880' as RepoDriverId,
        identityType: 'orcid',
        chain: 'mainnet',
        ownerAccountId: null,
        ownerAddress: null,
        areSplitsValid: false,
        lastProcessedVersion: '1.0.0',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const result = toGqlLinkedIdentity(orcidIdentity);

      expect(result).toEqual({
        chain: 'MAINNET',
        account: {
          driver: Driver.REPO,
          accountId:
            '81320912658542974439730181977206773330805723773165208113981035642880',
        },
        owner: null,
        areSplitsValid: false,
        isClaimed: false,
        orcid: '0009-0001-5257-5119',
        support: [],
        totalEarned: [],
        withdrawableBalances: [],
      });
    });
  });
});
