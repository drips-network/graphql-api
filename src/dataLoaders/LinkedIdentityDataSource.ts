import DataLoader from 'dataloader';
import type { LinkedIdentityDataValues } from '../linked-identity/LinkedIdentityModel';
import type {
  Address,
  DbSchema,
  RepoDriverId,
  RepoDriverMultiChainKey,
} from '../common/types';
import type {
  OrcidAccountWhereInput,
  OrcidAccountSortInput,
} from '../generated/graphql';
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
    chains: DbSchema[],
    accountId: RepoDriverId,
  ): Promise<LinkedIdentityDataValues | null> {
    const identities = await this._batchLinkedIdentitiesByIds.load({
      accountId,
      chains,
    });

    return identities || null;
  }

  public async getOrcidAccountsByFilter(
    chains: DbSchema[],
    where?: OrcidAccountWhereInput,
    sort?: OrcidAccountSortInput,
    limit?: number,
  ): Promise<LinkedIdentityDataValues[]> {
    return linkedIdentityQueries.getOrcidAccountsByFilter(
      chains,
      where,
      sort,
      limit,
    );
  }

  public async getOrcidAccountById(
    accountId: RepoDriverId,
    chains: DbSchema[],
  ): Promise<LinkedIdentityDataValues[] | null> {
    const chainKeys = chains.map((chain) => ({ accountId, chains: [chain] }));
    const results = await this._batchLinkedIdentitiesByIds.loadMany(chainKeys);

    const dbLinkedIdentities = results.filter(
      Boolean,
    ) as LinkedIdentityDataValues[];

    if (!dbLinkedIdentities?.length) {
      return null;
    }

    const orcidIdentities = dbLinkedIdentities.filter(
      (identity) => identity.identityType === 'orcid',
    );

    return orcidIdentities.length > 0 ? orcidIdentities : null;
  }
}
