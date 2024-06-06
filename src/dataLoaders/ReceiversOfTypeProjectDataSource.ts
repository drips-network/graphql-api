import DataLoader from 'dataloader';
import { QueryTypes } from 'sequelize';
import { DependencyType } from '../common/types';
import type {
  DripListMultiChainKey,
  DripListId,
  ProjectId,
  ProjectMultiChainKey,
} from '../common/types';
import type { RepoDriverSplitReceiverModelDataValues } from '../models/RepoDriverSplitReceiverModel';
import RepoDriverSplitReceiverModel from '../models/RepoDriverSplitReceiverModel';
import type { SupportedChain } from '../generated/graphql';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import { dbConnection } from '../database/connectToDatabase';

export default class ReceiversOfTypeProjectDataSource {
  private readonly _batchReceiversOfTypeProjectByProjectIds = new DataLoader(
    async (projectKeys: readonly ProjectMultiChainKey[]) => {
      const { chains, ids: projectIds } = parseMultiChainKeys(projectKeys);

      const baseSQL = (schema: SupportedChain) => `
        SELECT "id", "fundeeProjectId", "funderProjectId", "funderDripListId", "weight", "type"::TEXT, "blockTimestamp", "createdAt", "updatedAt",'${schema}' AS chain
        FROM "${schema}"."RepoDriverSplitReceivers"
      `;

      // Build the WHERE clause.
      const conditions: string[] = [
        `"funderProjectId" IN (:funderProjectIds)`,
        `type = '${DependencyType.ProjectDependency}'`,
      ];
      const parameters: { [key: string]: any } = {
        funderProjectIds: projectIds,
      };

      // Join conditions into a single WHERE clause.
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;

      // Build the SQL for each specified schema.
      const queries = chains.map((chain) => baseSQL(chain) + whereClause);

      // Combine all schema queries with UNION.
      const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

      const repoDriverSplitReceiverModelDataValues = (
        await dbConnection.query(fullQuery, {
          type: QueryTypes.SELECT,
          replacements: parameters,
          mapToModel: true,
          model: RepoDriverSplitReceiverModel,
        })
      ).map((p) => p.dataValues as RepoDriverSplitReceiverModelDataValues);

      const receiversOfTypeProjectToProjectMapping =
        repoDriverSplitReceiverModelDataValues.reduce<
          Record<ProjectId, RepoDriverSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.funderProjectId as ProjectId]) {
            mapping[receiver.funderProjectId as ProjectId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.funderProjectId as ProjectId].push(receiver);

          return mapping;
        }, {});

      return projectIds.map(
        (id) => receiversOfTypeProjectToProjectMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeProjectByProjectId(
    id: ProjectId,
    chains: SupportedChain[],
  ): Promise<RepoDriverSplitReceiverModelDataValues[]> {
    return this._batchReceiversOfTypeProjectByProjectIds.load({
      id,
      chains,
    });
  }

  private readonly _batchReceiversOfTypeProjectByDripListIds = new DataLoader(
    async (dripListKeys: readonly DripListMultiChainKey[]) => {
      const { chains, ids: dripListIds } = parseMultiChainKeys(dripListKeys);

      const baseSQL = (schema: SupportedChain) => `
        SELECT "id", "fundeeProjectId", "funderProjectId", "funderDripListId", "weight", "type"::TEXT, "blockTimestamp", "createdAt", "updatedAt",'${schema}' AS chain
        FROM "${schema}"."RepoDriverSplitReceivers"
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
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;

      // Build the SQL for each specified schema.
      const queries = chains.map((chain) => baseSQL(chain) + whereClause);

      // Combine all schema queries with UNION.
      const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

      const repoDriverSplitReceiverModelDataValues = (
        await dbConnection.query(fullQuery, {
          type: QueryTypes.SELECT,
          replacements: parameters,
          mapToModel: true,
          model: RepoDriverSplitReceiverModel,
        })
      ).map((p) => p.dataValues as RepoDriverSplitReceiverModelDataValues);

      const receiversOfTypeProjectToDripListMapping =
        repoDriverSplitReceiverModelDataValues.reduce<
          Record<DripListId, RepoDriverSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.funderDripListId as DripListId]) {
            mapping[receiver.funderDripListId as DripListId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.funderDripListId as DripListId].push(receiver);

          return mapping;
        }, {});

      return dripListIds.map(
        (id) => receiversOfTypeProjectToDripListMapping[id] || [],
      );
    },
  );

  public async getReceiversOfTypeProjectByDripListId(
    id: DripListId,
    chains: SupportedChain[],
  ): Promise<RepoDriverSplitReceiverModelDataValues[]> {
    return this._batchReceiversOfTypeProjectByDripListIds.load({
      id,
      chains,
    });
  }
}
