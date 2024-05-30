import { QueryTypes } from 'sequelize';
import DataLoader from 'dataloader';
import type {
  Address,
  DripListId,
  DripListMultiChainKey,
} from '../common/types';
import type { DripListWhereInput, SupportedChain } from '../generated/graphql';
import type { DripListDataValues } from '../drip-list/DripListModel';
import DripListModel from '../drip-list/DripListModel';
import TransferEventModel from '../drip-list/TransferEventModel';
import { dbConnection } from '../database/connectToDatabase';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';

export default class DripListsDataSource {
  private readonly _batchDripListsByIds = new DataLoader(
    async (
      dripListKeys: readonly DripListMultiChainKey[],
    ): Promise<DripListDataValues[]> => {
      const { chains, ids: dripListIds } = parseMultiChainKeys(dripListKeys);

      // Define base SQL to query from multiple chains (schemas).
      const baseSQL = (schema: SupportedChain) => `
        SELECT "id", "isValid", "ownerAddress", "ownerAccountId", "name", "latestVotingRoundId", "description", "creator", "previousOwnerAddress", "createdAt", "updatedAt", '${schema}' AS chain
        FROM "${schema}"."DripLists"
      `;

      // Initialize the WHERE clause parts.
      const conditions: string[] = [
        '"id" IN (:dripListIds)',
        '"isValid" = true',
      ];
      const parameters: { [key: string]: any } = { dripListIds };

      // Join conditions into a single WHERE clause.
      const whereClause =
        conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

      // Build the SQL for each specified schema.
      const queries = chains.map((chain) => baseSQL(chain) + whereClause);

      // Combine all schema queries with UNION.
      const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

      const dripListDataValues = (
        await dbConnection.query(fullQuery, {
          type: QueryTypes.SELECT,
          replacements: parameters,
          mapToModel: true,
          model: DripListModel,
        })
      ).map((p) => p.dataValues as DripListDataValues);

      const dripListIdToDripListMap = dripListDataValues.reduce<
        Record<DripListId, DripListDataValues>
      >((mapping, dripList) => {
        mapping[dripList.id] = dripList; // eslint-disable-line no-param-reassign

        return mapping;
      }, {});

      return dripListIds.map((id) => dripListIdToDripListMap[id]);
    },
  );

  public async getDripListById(
    id: DripListId,
    chains: SupportedChain,
  ): Promise<DripListDataValues> {
    return this._batchDripListsByIds.load({
      dripListId: id,
      chains: [chains],
    });
  }

  public async getDripListsByFilter(
    chains: SupportedChain[],
    where: DripListWhereInput,
  ): Promise<DripListDataValues[]> {
    // TODO: For all data sources, extract the SQL query building logic into a separate function/file.

    // Define base SQL to query from multiple chains (schemas).
    const baseSQL = (schema: SupportedChain) => `
        SELECT "id", "isValid", "name", "creator", "description", "ownerAddress", "ownerAccountId", "latestVotingRoundId", "previousOwnerAddress", "createdAt", "updatedAt", '${schema}' AS chain
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
    const queries = chains.map((chain) => baseSQL(chain) + whereClause);

    // Combine all schema queries with UNION.
    const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

    const dripListsDataValues = (
      await dbConnection.query(fullQuery, {
        type: QueryTypes.SELECT,
        replacements: parameters,
        mapToModel: true,
        model: DripListModel,
      })
    ).map((p) => p.dataValues as DripListDataValues);

    return dripListsDataValues.filter((p) => p.isValid && p.name);
  }

  public async getDripListsByIds(
    ids: DripListId[],
    chains: SupportedChain[],
  ): Promise<DripListDataValues[]> {
    return this._batchDripListsByIds.loadMany(
      ids.map((id) => ({
        dripListId: id,
        chains,
      })),
    ) as Promise<DripListDataValues[]>;
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
