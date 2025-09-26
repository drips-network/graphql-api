import DataLoader from 'dataloader';
import type { LinkedIdentityDataValues } from '../linked-identity/LinkedIdentityModel';
import type {
  Address,
  DbSchema,
  LinkedIdentityId,
  LinkedIdentityMultiChainKey,
} from '../common/types';
import type {
  LinkedIdentityWhereInput,
  LinkedIdentitySortInput,
} from '../generated/graphql';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import linkedIdentityQueries from './sqlQueries/linkedIdentityQueries';
import { assertIsLinkedIdentityId } from '../utils/assert';

export default class LinkedIdentityDataSource {
  private readonly _batchLinkedIdentitiesByIds = new DataLoader(
    async (
      identityKeys: readonly LinkedIdentityMultiChainKey[],
    ): Promise<LinkedIdentityDataValues[]> => {
      const { chains, ids: identityIds } = parseMultiChainKeys(identityKeys);

      const linkedIdentitiesDataValues = await linkedIdentityQueries.getByIds(
        chains,
        identityIds,
      );

      const identityIdToIdentityMap = linkedIdentitiesDataValues.reduce<
        Record<LinkedIdentityId, LinkedIdentityDataValues>
      >(
        (acc, identity) => {
          assertIsLinkedIdentityId(identity.accountId);
          acc[identity.accountId] = identity;
          return acc;
        },
        {} as Record<LinkedIdentityId, LinkedIdentityDataValues>,
      );

      return identityKeys.map((key) => identityIdToIdentityMap[key.accountId]);
    },
  );

  public async getLinkedIdentitiesByOwnerAddress(
    chains: DbSchema[],
    ownerAddress: Address,
  ): Promise<LinkedIdentityDataValues[]> {
    return linkedIdentityQueries.getByOwnerAddress(chains, ownerAddress);
  }

  public async getLinkedIdentityById(
    accountId: LinkedIdentityId,
    chains: DbSchema[],
  ): Promise<LinkedIdentityDataValues | null> {
    const identities = await this._batchLinkedIdentitiesByIds.load({
      chains,
      accountId,
    });

    return identities || null;
  }

  public async getLinkedIdentitiesByFilter(
    chains: DbSchema[],
    where?: LinkedIdentityWhereInput,
    sort?: LinkedIdentitySortInput,
    limit?: number,
  ): Promise<LinkedIdentityDataValues[]> {
    return linkedIdentityQueries.getLinkedIdentitiesByFilter(
      chains,
      where,
      sort,
      limit,
    );
  }
}
