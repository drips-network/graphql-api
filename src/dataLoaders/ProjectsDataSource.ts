import { QueryTypes } from 'sequelize';
import DataLoader from 'dataloader';
import type { ProjectDataValues } from '../project/ProjectModel';
import ProjectModel from '../project/ProjectModel';
import type { ProjectId, ProjectMultiChainKey } from '../common/types';
import {
  doesRepoExists,
  isValidProjectName,
  toApiProject,
  toFakeUnclaimedProjectFromUrl,
} from '../project/projectUtils';
import type {
  ProjectSortInput,
  ProjectWhereInput,
  SupportedChain,
} from '../generated/graphql';
import type { SplitEventModelDataValues } from '../models/SplitEventModel';
import SplitEventModel from '../models/SplitEventModel';
import type { GivenEventModelDataValues } from '../given-event/GivenEventModel';
import GivenEventModel from '../given-event/GivenEventModel';
import { dbConnection } from '../database/connectToDatabase';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';

export default class ProjectsDataSource {
  private readonly _batchProjectsByIds = new DataLoader(
    async (
      projectKeys: readonly ProjectMultiChainKey[],
    ): Promise<ProjectDataValues[]> => {
      const { chains, ids: projectIds } = parseMultiChainKeys(projectKeys);

      // Define base SQL to query from multiple chains (schemas).
      const baseSQL = (schema: SupportedChain) => `
        SELECT "id", "isValid", "name", "verificationStatus"::TEXT, "claimedAt", "forge"::TEXT, "ownerAddress", "ownerAccountId", "url", "emoji", "avatarCid", "color", "description", "createdAt", "updatedAt", '${schema}' AS chain
        FROM "${schema}"."GitProjects"
      `;

      // Initialize the WHERE clause parts.
      const conditions: string[] = ['"id" IN (:projectIds)'];
      const parameters: { [key: string]: any } = { projectIds };

      // Join conditions into a single WHERE clause.
      const whereClause =
        conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

      // Build the SQL for each specified schema.
      const queries = chains.map((chain) => baseSQL(chain) + whereClause);

      // Combine all schema queries with UNION.
      const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

      const projectsDataValues = (
        await dbConnection.query(fullQuery, {
          type: QueryTypes.SELECT,
          replacements: parameters,
          mapToModel: true,
          model: ProjectModel,
        })
      )
        .map((p) => p.dataValues as ProjectDataValues)
        .filter((p) => p.isValid)
        .filter((p) => (p.name ? isValidProjectName(p.name) : true));

      const projectsDataValuesWithApi = await Promise.all(
        projectsDataValues.map(toApiProject),
      );

      const filteredProjectsDataValues = projectsDataValuesWithApi.filter(
        Boolean,
      ) as ProjectDataValues[];

      const projectIdToProjectMap = filteredProjectsDataValues.reduce<
        Record<ProjectId, ProjectDataValues>
      >((mapping, project) => {
        mapping[project.id] = project; // eslint-disable-line no-param-reassign

        return mapping;
      }, {});

      return projectIds.map((id) => projectIdToProjectMap[id]);
    },
  );

  public async getProjectById(
    id: ProjectId,
    chain: SupportedChain,
  ): Promise<ProjectDataValues | null> {
    return toApiProject(
      await this._batchProjectsByIds.load({
        projectId: id,
        chains: [chain],
      }),
    );
  }

  public async getProjectByUrl(
    url: string,
    chain: SupportedChain,
  ): Promise<ProjectDataValues | null> {
    // Define base SQL to query from multiple chains (schemas).
    const baseSQL = (schema: SupportedChain) => `
        SELECT "id", "isValid", "name", "verificationStatus"::TEXT, "claimedAt", "forge"::TEXT, "ownerAddress", "ownerAccountId", "url", "emoji", "avatarCid", "color", "description", "createdAt", "updatedAt", '${schema}' AS chain
        FROM "${schema}"."GitProjects"
    `;

    // Initialize the WHERE clause parts.
    const conditions: string[] = ['"url" = :url'];
    const parameters: { [key: string]: any } = { url };

    // Join conditions into a single WHERE clause.
    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    // Build the SQL for each specified schema.
    const query = `${baseSQL(chain) + whereClause} LIMIT 1`;

    const projectDataValues = (
      await dbConnection.query(query, {
        type: QueryTypes.SELECT,
        replacements: parameters,
        mapToModel: true,
        model: ProjectModel,
      })
    ).map((p) => p.dataValues as ProjectDataValues);

    const [project] = projectDataValues || [];

    if (projectDataValues) {
      return toApiProject(project);
    }

    const exists = await doesRepoExists(url);

    return exists ? toFakeUnclaimedProjectFromUrl(url) : null;
  }

  public async getProjectsByFilter(
    chains: SupportedChain[],
    where: ProjectWhereInput,
    sort?: ProjectSortInput,
  ): Promise<ProjectDataValues[]> {
    // Define base SQL to query from multiple chains (schemas).
    const baseSQL = (schema: SupportedChain) => `
        SELECT "id", "isValid", "name", "verificationStatus"::TEXT, "claimedAt", "forge"::TEXT, "ownerAddress", "ownerAccountId", "url", "emoji", "avatarCid", "color", "description", "createdAt", "updatedAt", '${schema}' AS chain
        FROM "${schema}"."GitProjects"
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
    if (where?.url) {
      conditions.push(`"url" = :url`);
      parameters.url = where.url;
    }
    if (where?.verificationStatus) {
      conditions.push(`"verificationStatus" = :verificationStatus`);
      parameters.verificationStatus = where.verificationStatus;
    }

    // Join conditions into a single WHERE clause.
    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    // Define the order.
    const orderClause = sort
      ? ` ORDER BY "${sort.field}" ${sort.direction || 'DESC'}`
      : '';

    // Build the SQL for each specified schema.
    const queries = chains.map(
      (chain) => baseSQL(chain) + whereClause + orderClause,
    );

    // Combine all schema queries with UNION.
    const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

    const projectsDataValues = (
      await dbConnection.query(fullQuery, {
        type: QueryTypes.SELECT,
        replacements: parameters,
        mapToModel: true,
        model: ProjectModel,
      })
    ).map((p) => p.dataValues as ProjectDataValues);

    return Promise.all(
      projectsDataValues
        .filter((p) => p.isValid)
        .filter((p) => (p.name ? isValidProjectName(p.name) : true))
        .map(toApiProject)
        .filter(Boolean) as ProjectDataValues[],
    );
  }

  public async getProjectsByIds(
    ids: ProjectId[],
    chains: SupportedChain[],
  ): Promise<ProjectDataValues[]> {
    return this._batchProjectsByIds.loadMany(
      ids.map((id) => ({
        projectId: id,
        chains,
      })),
    ) as Promise<ProjectDataValues[]>;
  }

  public async getEarnedFunds(
    projectId: ProjectId,
    chains: SupportedChain[],
  ): Promise<
    {
      tokenAddress: string;
      amount: string;
      chain: SupportedChain;
    }[]
  > {
    const amounts = await Promise.all([
      this._getIncomingSplitTotal(projectId, chains),
      this._getIncomingGivesTotal(projectId, chains),
    ]);

    return this._mergeAmounts(...amounts);
  }

  private async _getIncomingSplitTotal(
    accountId: string,
    chains: SupportedChain[],
  ) {
    // Define base SQL to query from multiple chains (schemas).
    const baseSQL = (schema: SupportedChain) =>
      `SELECT 
        "accountId", 
        "receiver", 
        "erc20", 
        "amt", 
        "transactionHash", 
        "logIndex", 
        "blockTimestamp", 
        "blockNumber", 
        "createdAt", 
        "updatedAt", 
        '${schema}' AS chain 
      FROM "${schema}"."SplitEvents"`;

    // Initialize the WHERE clause parts.
    const conditions: string[] = ['"receiver" = :receiver'];
    const parameters: { [receiver: string]: any } = { receiver: accountId };

    // Create the WHERE clause.
    const whereClause = ` WHERE ${conditions.join(' AND ')}`;

    // Build the SQL for each specified schema.
    const queries = chains.map((chain) => baseSQL(chain) + whereClause);

    // Combine all schema queries with UNION.
    const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

    const incomingSplitEventModelDataValues = (
      await dbConnection.query(fullQuery, {
        type: QueryTypes.SELECT,
        replacements: parameters,
        mapToModel: true,
        model: SplitEventModel,
      })
    ).map((p) => p.dataValues as SplitEventModelDataValues);

    return incomingSplitEventModelDataValues.reduce<
      {
        tokenAddress: string;
        amount: bigint;
        chain: SupportedChain;
      }[]
    >((acc, curr) => {
      const existing = acc.find((e) => e.tokenAddress === curr.erc20);

      const amount = BigInt(curr.amt);

      if (existing) {
        existing.amount += amount;
      } else {
        acc.push({
          tokenAddress: curr.erc20,
          amount,
          chain: curr.chain,
        });
      }

      return acc;
    }, []);
  }

  private async _getIncomingGivesTotal(
    accountId: string,
    chains: SupportedChain[],
  ) {
    // Define base SQL to query from multiple chains (schemas).
    const baseSQL = (schema: SupportedChain) =>
      `SELECT 
        "accountId", 
        "receiver", 
        "erc20", 
        "amt", 
        "transactionHash", 
        "logIndex", 
        "blockTimestamp",
        "blockNumber", 
        "createdAt", 
        "updatedAt", 
        '${schema}' AS chain
      FROM "${schema}"."GivenEvents"`;

    // Initialize the WHERE clause parts.
    const conditions: string[] = ['"receiver" = :receiver'];
    const parameters: { [receiver: string]: any } = { receiver: accountId };

    // Create the WHERE clause.
    const whereClause = ` WHERE ${conditions.join(' AND ')}`;

    // Build the SQL for each specified schema.
    const queries = chains.map((chain) => baseSQL(chain) + whereClause);

    // Combine all schema queries with UNION.
    const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

    const incomingGivenEventModelDataValues = (
      await dbConnection.query(fullQuery, {
        type: QueryTypes.SELECT,
        replacements: parameters,
        mapToModel: true,
        model: GivenEventModel,
      })
    ).map((p) => p.dataValues as GivenEventModelDataValues);

    return incomingGivenEventModelDataValues.reduce<
      {
        tokenAddress: string;
        amount: bigint;
        chain: SupportedChain;
      }[]
    >((acc, curr) => {
      const existing = acc.find((e) => e.tokenAddress === curr.erc20);

      const amount = BigInt(curr.amt);
      if (existing) {
        existing.amount += amount;
      } else {
        acc.push({
          tokenAddress: curr.erc20,
          amount,
          chain: curr.chain,
        });
      }

      return acc;
    }, []);
  }

  private async _mergeAmounts(
    ...args: {
      tokenAddress: string;
      amount: bigint;
      chain: SupportedChain;
    }[][]
  ) {
    const amounts = new Map<
      string,
      {
        tokenAddress: string;
        amount: bigint;
        chain: SupportedChain;
      }
    >();

    args.forEach((amountsArray) => {
      amountsArray.forEach((amount) => {
        const key = `${amount.chain}-${amount.tokenAddress}`;
        const existingAmount = amounts.get(key);
        if (existingAmount) {
          amounts.set(key, {
            ...existingAmount,
            amount: existingAmount.amount + amount.amount,
          });
        } else {
          amounts.set(key, amount);
        }
      });
    });

    return Array.from(amounts.values()).map((x) => ({
      tokenAddress: x.tokenAddress,
      amount: x.amount.toString(),
      chain: x.chain,
    }));
  }
}
