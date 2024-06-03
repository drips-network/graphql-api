import DataLoader from 'dataloader';
import { QueryTypes } from 'sequelize';
import { DependencyType } from '../common/types';
import type {
  ProjectMultiChainKey,
  DripListId,
  ProjectId,
  DripListMultiChainKey,
} from '../common/types';
import type { DripListSplitReceiverModelDataValues } from '../models/DripListSplitReceiverModel';
import DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';
import { dbConnection } from '../database/connectToDatabase';
import type { SupportedChain } from '../generated/graphql';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';

export default class ReceiversOfTypeDripListDataSource {
  private readonly _batchReceiversOfTypeDripListByProjectIds = new DataLoader(
    async (projectKeys: readonly ProjectMultiChainKey[]) => {
      const { chains, ids: projectIds } = parseMultiChainKeys(projectKeys);

      const baseSQL = (schema: SupportedChain) => `
        SELECT "id", "fundeeDripListId", "funderProjectId", "funderDripListId", "weight", "type"::TEXT, "blockTimestamp", "createdAt", "updatedAt",'${schema}' AS chain
        FROM "${schema}"."DripListSplitReceivers"
      `;

      // Build the WHERE clause.
      const conditions: string[] = [
        `"funderDripListId" IN (:funderProjectIds)`,
        `type = '${DependencyType.ProjectDependency}'`,
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

      const dripListSplitReceiverModelDataValues = (
        await dbConnection.query(fullQuery, {
          type: QueryTypes.SELECT,
          replacements: parameters,
          mapToModel: true,
          model: DripListSplitReceiverModel,
        })
      ).map((p) => p.dataValues as DripListSplitReceiverModelDataValues);

      const receiversOfTypeDripListToProjectListMapping =
        dripListSplitReceiverModelDataValues.reduce<
          Record<ProjectId, DripListSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.funderProjectId as ProjectId]) {
            mapping[receiver.funderProjectId as ProjectId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.funderProjectId as ProjectId].push(receiver);

          return mapping;
        }, {});

      return projectIds.map(
        (id) => receiversOfTypeDripListToProjectListMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeDripListByProjectId(
    id: ProjectId,
    chains: SupportedChain[],
  ): Promise<DripListSplitReceiverModelDataValues[]> {
    return this._batchReceiversOfTypeDripListByProjectIds.load({
      id,
      chains,
    });
  }

  private readonly _batchReceiversOfTypeDripListByDripListIds = new DataLoader(
    async (dripListKeys: readonly DripListMultiChainKey[]) => {
      const { chains, ids: dripListIds } = parseMultiChainKeys(dripListKeys);

      const baseSQL = (schema: SupportedChain) => `
        SELECT "id", "fundeeDripListId", "funderProjectId", "funderDripListId", "weight", "type"::TEXT, "blockTimestamp", "createdAt", "updatedAt",'${schema}' AS chain
        FROM "${schema}"."DripListSplitReceivers"
      `;

      // Build the WHERE clause.
      const conditions: string[] = [
        `"funderDripListId" IN (:funderDripListIds)`,
        `type = '${DependencyType.DripListDependency}'`,
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

      const dripListSplitReceiverModelDataValues = (
        await dbConnection.query(fullQuery, {
          type: QueryTypes.SELECT,
          replacements: parameters,
          mapToModel: true,
          model: DripListSplitReceiverModel,
        })
      ).map((p) => p.dataValues as DripListSplitReceiverModelDataValues);

      const receiversOfTypeDripListToDripListMapping =
        dripListSplitReceiverModelDataValues.reduce<
          Record<DripListId, DripListSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.funderDripListId as DripListId]) {
            mapping[receiver.funderDripListId as DripListId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.funderDripListId as DripListId].push(receiver);

          return mapping;
        }, {});

      return dripListIds.map(
        (id) => receiversOfTypeDripListToDripListMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeDripListByDripListId(
    id: DripListId,
    chains: SupportedChain[],
  ): Promise<DripListSplitReceiverModelDataValues[]> {
    return this._batchReceiversOfTypeDripListByDripListIds.load({
      id,
      chains,
    });
  }
}
