import { QueryTypes } from 'sequelize';
import DataLoader from 'dataloader';
import type { ProjectDataValues } from '../project/ProjectModel';
import type {
  AccountId,
  ProjectId,
  ProjectMultiChainKey,
} from '../common/types';
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
import { dbConnection } from '../database/connectToDatabase';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import projectsQueries from './sqlQueries/projectsQueries';
import givenEventsQueries from './sqlQueries/givenEventsQueries';

export default class ProjectsDataSource {
  private readonly _batchProjectsByIds = new DataLoader(
    async (
      projectKeys: readonly ProjectMultiChainKey[],
    ): Promise<ProjectDataValues[]> => {
      const { chains, ids: projectIds } = parseMultiChainKeys(projectKeys);

      const projectsDataValues = await projectsQueries.getByIds(
        chains,
        projectIds,
      );

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
        id,
        chains: [chain],
      }),
    );
  }

  public async getProjectByUrl(
    url: string,
    chain: SupportedChain,
  ): Promise<ProjectDataValues | null> {
    const project = await projectsQueries.getByUrl(chain, url);

    if (project) {
      return toApiProject(project);
    }

    const exists = await doesRepoExists(url);

    return exists ? toFakeUnclaimedProjectFromUrl(url) : null;
  }

  public async getProjectsByFilter(
    chains: SupportedChain[],
    where?: ProjectWhereInput,
    sort?: ProjectSortInput,
  ): Promise<ProjectDataValues[]> {
    const projectsDataValues = await projectsQueries.getByFilter(
      chains,
      where,
      sort,
    );

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
        id,
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
      `SELECT *, '${schema}' AS chain FROM "${schema}"."SplitEvents"`;

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
    accountId: AccountId,
    chains: SupportedChain[],
  ) {
    const incomingGivenEventModelDataValues =
      await givenEventsQueries.getByReceiver(chains, accountId);

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
