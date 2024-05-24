import DataLoader from 'dataloader';
import { Op, QueryTypes } from 'sequelize';
import type {
  AccountId,
  DripListId,
  DripListMultiChainKey,
  ProjectId,
  ProjectMultiChainKey,
} from '../common/types';
import DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';
import type { GivenEventModelDataValues } from '../given-event/GivenEventModel';
import GivenEventModel from '../given-event/GivenEventModel';
import type { RepoDriverSplitReceiverModelDataValues } from '../models/RepoDriverSplitReceiverModel';
import RepoDriverSplitReceiverModel from '../models/RepoDriverSplitReceiverModel';
import streams from '../utils/streams';
import type { ProtoStream } from '../utils/buildAssetConfigs';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import type { SupportedChain } from '../generated/graphql';
import { dbConnection } from '../database/connectToDatabase';
import { isDripListId, isProjectId } from '../utils/assert';
import shouldNeverHappen from '../utils/shouldNeverHappen';

export default class ProjectAndDripListSupportDataSource {
  private readonly _batchProjectAndDripListSupportByDripListIds =
    new DataLoader(async (dripListIds: readonly DripListId[]) => {
      const projectAndDripListSupport =
        await DripListSplitReceiverModel.findAll({
          where: {
            fundeeDripListId: {
              [Op.in]: dripListIds,
            },
          },
        });

      const projectAndDripListSupportToDripListMapping =
        projectAndDripListSupport.reduce<
          Record<DripListId, DripListSplitReceiverModel[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.fundeeDripListId]) {
            mapping[receiver.fundeeDripListId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.fundeeDripListId].push(receiver);

          return mapping;
        }, {});

      return dripListIds.map(
        (id) => projectAndDripListSupportToDripListMapping[id] || [],
      );
    });

  private readonly _batchProjectAndDripListSupportByProjectIds = new DataLoader(
    async (projectKeys: readonly ProjectMultiChainKey[]) => {
      const { chains, ids: projectIds } = parseMultiChainKeys(projectKeys);

      // Define base SQL to query from multiple chains (schemas).
      const baseSQL = (schema: SupportedChain) => `
          SELECT "id", "fundeeProjectId", "funderProjectId", "funderDripListId", "weight", "type"::TEXT, "blockTimestamp", "createdAt", "updatedAt", '${schema}' AS chain
          FROM "${schema}"."RepoDriverSplitReceivers"
      `;

      // Build the WHERE clause.
      const conditions: string[] = [`"fundeeProjectId" IN (:fundeeProjectIds)`];
      const parameters: { [key: string]: any } = {
        fundeeProjectIds: projectIds,
      };

      // Join conditions into a single WHERE clause.
      const whereClause =
        conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

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

      const projectAndDripListSupportToProjectMapping =
        repoDriverSplitReceiverModelDataValues.reduce<
          Record<ProjectId, RepoDriverSplitReceiverModelDataValues[]>
        >((mapping, receiver) => {
          if (!mapping[receiver.fundeeProjectId]) {
            mapping[receiver.fundeeProjectId] = []; // eslint-disable-line no-param-reassign
          }

          mapping[receiver.fundeeProjectId].push(receiver);

          return mapping;
        }, {});

      return projectIds.map(
        (id) => projectAndDripListSupportToProjectMapping[id] || [],
      );
    },
  );

  private readonly _batchStreamSupportByAccountIds = new DataLoader(
    async (accountIds: readonly AccountId[]) => {
      const streamsToList = (
        await Promise.all(
          accountIds.map((accountId) =>
            streams.getUserIncomingStreams(accountId),
          ),
        )
      ).flat();

      const streamSupportToAccountMapping = streamsToList.reduce<
        Record<AccountId, ProtoStream[]>
      >((mapping, stream) => {
        if (!mapping[stream.sender.accountId as AccountId]) {
          mapping[stream.receiver.accountId as AccountId] = []; // eslint-disable-line no-param-reassign
        }

        mapping[stream.receiver.accountId as AccountId].push(stream);

        return mapping;
      }, {});

      return accountIds.map((id) => streamSupportToAccountMapping[id] || []);
    },
  );

  private readonly _batchOneTimeDonationSupportByAccountIds = new DataLoader(
    async (keys: readonly (DripListMultiChainKey | ProjectMultiChainKey)[]) => {
      const { chains, ids } = parseMultiChainKeys(keys);

      const baseSQL = (schema: SupportedChain) => `
        SELECT "accountId", "receiver", "erc20", "amt", "blockTimestamp", "logIndex", "blockTimestamp", "transactionHash", "createdAt", "updatedAt",'${schema}' AS chain
        FROM "${schema}"."GivenEvents"
      `;

      // Build the WHERE clause.
      const conditions: string[] = [`"receiver" IN (:ids)`];
      const parameters: { [key: string]: any } = { ids };

      // Join conditions into a single WHERE clause.
      const whereClause =
        conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

      // Build the SQL for each specified schema.
      const queries = chains.map((chain) => baseSQL(chain) + whereClause);

      // Combine all schema queries with UNION.
      const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

      const oneTimeDonationSupport = (
        await dbConnection.query(fullQuery, {
          type: QueryTypes.SELECT,
          replacements: parameters,
          mapToModel: true,
          model: GivenEventModel,
        })
      ).map((p) => p.dataValues as GivenEventModelDataValues);

      const oneTimeDonationSupportToDripListMapping =
        oneTimeDonationSupport.reduce<
          Record<AccountId, GivenEventModelDataValues[]>
        >((mapping, givenEvent) => {
          if (!mapping[givenEvent.receiver]) {
            mapping[givenEvent.receiver] = []; // eslint-disable-line no-param-reassign
          }

          mapping[givenEvent.receiver].push(givenEvent);

          return mapping;
        }, {});

      return ids.map((id) => oneTimeDonationSupportToDripListMapping[id] || []);
    },
  );

  public async getProjectAndDripListSupportByDripListId(
    id: DripListId,
  ): Promise<DripListSplitReceiverModel[]> {
    return this._batchProjectAndDripListSupportByDripListIds.load(id);
  }

  public async getProjectAndDripListSupportByProjectId(
    id: ProjectId,
    chains: SupportedChain[],
  ): Promise<RepoDriverSplitReceiverModelDataValues[]> {
    return this._batchProjectAndDripListSupportByProjectIds.load({
      projectId: id,
      chains,
    });
  }

  public async getOneTimeDonationSupportByAccountId(
    id: DripListId | ProjectId,
    chains: SupportedChain[],
  ): Promise<GivenEventModelDataValues[]> {
    // eslint-disable-next-line no-nested-ternary
    const key = isDripListId(id)
      ? { dripListId: id, chains }
      : isProjectId(id)
      ? { projectId: id, chains }
      : shouldNeverHappen();

    return this._batchOneTimeDonationSupportByAccountIds.load(key);
  }

  public async getStreamSupportByAccountId(
    id: AccountId,
  ): Promise<ProtoStream[]> {
    return this._batchStreamSupportByAccountIds.load(id);
  }
}
