import { Op, QueryTypes } from 'sequelize';
import DataLoader from 'dataloader';
import type { SupportedChain, Address, DripListId } from '../common/types';
import type { DripListWhereInput } from '../generated/graphql';
import DripListModel from '../drip-list/DripListModel';
import TransferEventModel from '../drip-list/TransferEventModel';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import queryableChains from '../common/queryableChains';
import { dbConnection } from '../database/connectToDatabase';

interface DripListKey {
  dripListId: DripListId;
  chain: SupportedChain;
}

export default class DripListsDataSource {
  private readonly _batchDripListsByIds = new DataLoader(
    async (dripListKeys: readonly DripListKey[]): Promise<DripListModel[]> => {
      const dripListIds = dripListKeys.map((key) => key.dripListId);
      const chains = dripListKeys.map((key) => key.chain);

      if (new Set(chains).size !== 1) {
        shouldNeverHappen('Chains are not the same.');
      }

      const chain = chains[0];

      const dripLists = await DripListModel.schema(chain).findAll({
        where: {
          id: {
            [Op.in]: dripListIds,
          },
          isValid: true,
        },
      });

      const dripListIdToDripListMap = dripLists.reduce<
        Record<DripListId, DripListModel>
      >((mapping, dripList) => {
        dripList.chain = chain; // eslint-disable-line no-param-reassign
        mapping[dripList.id] = dripList; // eslint-disable-line no-param-reassign

        return mapping;
      }, {});

      return dripListIds.map((id) => dripListIdToDripListMap[id]);
    },
  );

  public async getDripListById(
    id: DripListId,
    chain: SupportedChain,
  ): Promise<DripListModel> {
    return this._batchDripListsByIds.load({
      dripListId: id,
      chain,
    });
  }

  public async getDripListsByFilter(
    where: DripListWhereInput,
    chains: SupportedChain[] = queryableChains,
  ): Promise<DripListModel[]> {
    // Define base SQL to query from multiple chains (schemas).
    const baseSQL = (schema: string) => `
        SELECT "id", "isValid", "ownerAddress", "ownerAccountId", "name", "latestVotingRoundId", "description", "creator", "previousOwnerAddress", "createdAt", "updatedAt", '${schema}' AS chain
        FROM "${schema}"."DripLists"
    `;

    // Initialize the WHERE clause parts.
    const conditions: string[] = [];
    const parameters: { [key: string]: any } = {};

    // Build the WHERE clause based on input filters.
    if (where?.id) {
      conditions.push(`"id" = :id`);
      parameters.id = where.id;
    }
    if (where?.ownerAddress) {
      conditions.push(`"ownerAddress" = :ownerAddress`);
      parameters.ownerAddress = where.ownerAddress;
    }

    // Join conditions into a single WHERE clause.
    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    // Build the SQL for each specified schema.
    const queries = (chains || queryableChains).map(
      (chain) => baseSQL(chain) + whereClause,
    );

    // Combine all schema queries with UNION.
    const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

    const dripLists = await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: DripListModel,
    });
    console.log(
      '💧💧💧💧💧💧 ~ DripListsDataSource ~ dripLists:',
      dripLists[0].chain,
    );

    return dripLists.filter((d) => d.isValid && d.name);
  }

  public async getDripListsByIds(
    ids: DripListId[],
    chain: SupportedChain,
  ): Promise<DripListModel[]> {
    return this._batchDripListsByIds.loadMany(
      ids.map((id) => ({
        dripListId: id,
        chain,
      })),
    ) as Promise<DripListModel[]>;
  }

  public async getMintedTokensCountByAccountId(
    ownerAddress: Address,
  ): Promise<number> {
    // TODO: Fix edge case. This will not count tokens minted by the owner but immediately transferred to another address.
    const total = await TransferEventModel.count({
      where: {
        to: ownerAddress,
      },
    });

    return total;
  }
}
