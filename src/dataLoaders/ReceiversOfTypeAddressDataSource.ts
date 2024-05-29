import DataLoader from 'dataloader';
import { QueryTypes } from 'sequelize';
import type {
  DripListId,
  DripListMultiChainKey,
  ProjectId,
  ProjectMultiChainKey,
} from '../common/types';
import type { AddressDriverSplitReceiverModelDataValues } from '../models/AddressDriverSplitReceiverModel';
import AddressDriverSplitReceiverModel, {
  AddressDriverSplitReceiverType,
} from '../models/AddressDriverSplitReceiverModel';
import type { SupportedChain } from '../generated/graphql';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import { dbConnection } from '../database/connectToDatabase';

export default class ReceiversOfTypeAddressDataSource {
  private readonly _batchReceiversOfTypeAddressByProjectIds = new DataLoader(
    async (projectKeys: readonly ProjectMultiChainKey[]) => {
      const { chains, ids: projectIds } = parseMultiChainKeys(projectKeys);

      const baseSQL = (schema: SupportedChain) => `
      SELECT "id", "fundeeAccountId", "fundeeAccountAddress", "funderProjectId", "funderDripListId", "weight", "type"::TEXT, "createdAt", "updatedAt",'${schema}' AS chain
      FROM "${schema}"."AddressDriverSplitReceivers"
      `;

      // Build the WHERE clause.
      const conditions: string[] = [
        `"funderDripListId" IN (:funderProjectIds)`,
        `type IN ('${AddressDriverSplitReceiverType.ProjectMaintainer}', '${AddressDriverSplitReceiverType.ProjectDependency}')`,
      ];
      const parameters: { [key: string]: any } = {
        funderProjectIds: projectIds,
      };

      // Join conditions into a single WHERE clause.
      const whereClause =
        conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

      // Build the SQL for each specified schema.
      const queries = chains.map((chain) => baseSQL(chain) + whereClause);

      // Combine all schema queries with UNION.
      const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

      const addressDriverSplitReceiverModelDataValues = (
        await dbConnection.query(fullQuery, {
          type: QueryTypes.SELECT,
          replacements: parameters,
          mapToModel: true,
          model: AddressDriverSplitReceiverModel,
        })
      ).map((p) => p.dataValues as AddressDriverSplitReceiverModelDataValues);

      const receiversOfTypeAddressToProjectMapping =
        addressDriverSplitReceiverModelDataValues.reduce<
          Record<ProjectId, AddressDriverSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.funderProjectId as ProjectId]) {
            mapping[receiver.funderProjectId as ProjectId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.funderProjectId as ProjectId].push(receiver);

          return mapping;
        }, {});

      return projectIds.map(
        (id) => receiversOfTypeAddressToProjectMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeAddressByProjectId(
    id: ProjectId,
    chains: SupportedChain[],
  ): Promise<AddressDriverSplitReceiverModelDataValues[]> {
    return this._batchReceiversOfTypeAddressByProjectIds.load({
      projectId: id,
      chains,
    });
  }

  private readonly _batchReceiversOfTypeAddressByDripListIds = new DataLoader(
    async (dripListKeys: readonly DripListMultiChainKey[]) => {
      const { chains, ids: dripListIds } = parseMultiChainKeys(dripListKeys);

      // Define base SQL to query from multiple chains (schemas).
      const baseSQL = (schema: SupportedChain) => `
          SELECT "id", "fundeeAccountId", "fundeeAccountAddress", "funderProjectId", "funderDripListId","weight", "type"::TEXT, "createdAt", "updatedAt", '${schema}' AS chain
          FROM "${schema}"."AddressDriverSplitReceivers"
      `;

      // Build the WHERE clause.
      const conditions: string[] = [
        `"funderDripListId" IN (:funderDripListIds)`,
        `"type" IN ('${AddressDriverSplitReceiverType.DripListDependency}')`,
      ];
      const parameters: { [key: string]: any } = {
        funderDripListIds: dripListIds,
      };

      // Join conditions into a single WHERE clause.
      const whereClause =
        conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

      // Build the SQL for each specified schema.
      const queries = chains.map((chain) => baseSQL(chain) + whereClause);

      // Combine all schema queries with UNION.
      const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

      const addressDriverSplitReceiverModelDataValues = (
        await dbConnection.query(fullQuery, {
          type: QueryTypes.SELECT,
          replacements: parameters,
          mapToModel: true,
          model: AddressDriverSplitReceiverModel,
        })
      ).map((p) => p.dataValues as AddressDriverSplitReceiverModelDataValues);

      const receiversOfTypeAddressToDripListMapping =
        addressDriverSplitReceiverModelDataValues.reduce<
          Record<DripListId, AddressDriverSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.funderDripListId as DripListId]) {
            mapping[receiver.funderDripListId as DripListId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.funderDripListId as DripListId].push(receiver);

          return mapping;
        }, {});

      return dripListIds.map(
        (id) => receiversOfTypeAddressToDripListMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeAddressByDripListId(
    id: DripListId,
    chains: SupportedChain[],
  ): Promise<AddressDriverSplitReceiverModelDataValues[]> {
    return this._batchReceiversOfTypeAddressByDripListIds.load({
      dripListId: id,
      chains,
    });
  }
}
