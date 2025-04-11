import DataLoader from 'dataloader';
import type {
  DbSchema,
  NftDriverId,
  NftDriverMultiChainKey,
} from '../common/types';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import ecosystemsQueries from './sqlQueries/ecosystemsQueries';
import type { EcosystemDataValues } from '../ecosystem/EcosystemMainAccountModel';

export default class EcosystemsDataSource {
  private readonly _batchEcosystemsById = new DataLoader(
    async (
      ecosystemKeys: readonly NftDriverMultiChainKey[],
    ): Promise<(EcosystemDataValues | null)[]> => {
      const { chains, ids: ecosystemIds } = parseMultiChainKeys(ecosystemKeys);

      const ecosystemDataValues = await ecosystemsQueries.getByIds(
        chains,
        ecosystemIds,
      );

      const ecosystemIdToEcosystemMap = ecosystemDataValues.reduce<
        Record<NftDriverId, EcosystemDataValues>
      >((mapping, ecosystem) => {
        mapping[ecosystem.id] = ecosystem; // eslint-disable-line no-param-reassign

        return mapping;
      }, {});

      return ecosystemKeys.map(
        ({ id }) => ecosystemIdToEcosystemMap[id] || null,
      );
    },
  );

  public async getEcosystemById(
    id: NftDriverId,
    chains: DbSchema[],
  ): Promise<EcosystemDataValues | null> {
    return this._batchEcosystemsById.load({
      id,
      chains,
    });
  }
}
