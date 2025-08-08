import DataLoader from 'dataloader';
import type { LinkedIdentityDataValues } from '../linked-identity/LinkedIdentityModel';
import type {
  Address,
  DbSchema,
  RepoDriverId,
  RepoDriverMultiChainKey,
} from '../common/types';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import linkedIdentityQueries from './sqlQueries/linkedIdentityQueries';

export default class LinkedIdentityDataSource {
  private readonly _batchLinkedIdentitiesByIds = new DataLoader(
    async (
      identityKeys: readonly RepoDriverMultiChainKey[],
    ): Promise<LinkedIdentityDataValues[]> => {
      const { chains, ids: identityIds } = parseMultiChainKeys(identityKeys);

      const linkedIdentitiesDataValues = await linkedIdentityQueries.getByIds(
        chains,
        identityIds,
      );

      const identityIdToIdentityMap = linkedIdentitiesDataValues.reduce<
        Record<RepoDriverId, LinkedIdentityDataValues>
      >(
        (acc, identity) => {
          acc[identity.accountId] = identity;
          return acc;
        },
        {} as Record<RepoDriverId, LinkedIdentityDataValues>,
      );

      return identityKeys.map((key) => {
        const identity = identityIdToIdentityMap[key.accountId];
        if (!identity) {
          throw new Error(`LinkedIdentity with ID ${key.accountId} not found.`);
        }
        return identity;
      });
    },
  );

  public async getLinkedIdentitiesByOwnerAddress(
    chains: DbSchema[],
    ownerAddress: Address,
  ): Promise<LinkedIdentityDataValues[]> {
    return linkedIdentityQueries.getByOwnerAddress(chains, ownerAddress);
  }

  public async getLinkedIdentityById(
    chains: DbSchema[],
    accountId: RepoDriverId,
  ): Promise<LinkedIdentityDataValues | null> {
    const identities = await this._batchLinkedIdentitiesByIds.load({
      accountId,
      chains,
    });

    return identities || null;
  }
}
