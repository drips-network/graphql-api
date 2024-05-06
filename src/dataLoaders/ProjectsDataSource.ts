import { Op, QueryTypes } from 'sequelize';
import DataLoader from 'dataloader';
import ProjectModel from '../project/ProjectModel';
import type {
  SupportedChain,
  FakeUnclaimedProject,
  ProjectId,
} from '../common/types';
import {
  doesRepoExists,
  isValidateProjectName,
  toApiProject,
  toFakeUnclaimedProjectFromUrl,
} from '../project/projectUtils';
import type { ProjectSortInput, ProjectWhereInput } from '../generated/graphql';
import SplitEventModel from '../models/SplitEventModel';
import GivenEventModel from '../given-event/GivenEventModel';
import queryableChains from '../common/queryableChains';
import { dbConnection } from '../database/connectToDatabase';
import shouldNeverHappen from '../utils/shouldNeverHappen';

interface ProjectKey {
  projectId: ProjectId;
  chain: SupportedChain;
}

export default class ProjectsDataSource {
  private readonly _batchProjectsByIds = new DataLoader(
    async (projectKeys: readonly ProjectKey[]): Promise<ProjectModel[]> => {
      const projectIds = projectKeys.map((key) => key.projectId);
      const chains = projectKeys.map((key) => key.chain);

      if (new Set(chains).size !== 1) {
        shouldNeverHappen('Chains are not the same.');
      }

      const chain = chains[0];

      const projects = await ProjectModel.schema(chain)
        .findAll({
          where: {
            id: {
              [Op.in]: projectIds,
            },
            isValid: true,
          },
        })
        .then((projectModels) =>
          projectModels.filter((p) =>
            p.name ? isValidateProjectName(p.name) : true,
          ),
        );

      const projectIdToProjectMap = projects.reduce<
        Record<ProjectId, ProjectModel>
      >((mapping, project) => {
        project.chain = chain; // eslint-disable-line no-param-reassign
        mapping[project.id] = project; // eslint-disable-line no-param-reassign

        return mapping;
      }, {});

      return projectIds.map((id) => projectIdToProjectMap[id]);
    },
  );

  public async getProjectById(
    id: ProjectId,
    chain: SupportedChain,
  ): Promise<ProjectModel | FakeUnclaimedProject | null> {
    return toApiProject(
      await this._batchProjectsByIds.load({
        projectId: id,
        chain,
      }),
    );
  }

  public async getProjectByUrl(
    url: string,
    chain: SupportedChain,
  ): Promise<ProjectModel | FakeUnclaimedProject | null> {
    const project = await ProjectModel.schema(chain).findOne({
      where: { url },
    });

    if (project) {
      project.chain = chain;
      return toApiProject(project);
    }

    const exists = await doesRepoExists(url);

    return exists ? toFakeUnclaimedProjectFromUrl(url, chain) : null;
  }

  public async getProjectsByFilter(
    where: ProjectWhereInput,
    sort?: ProjectSortInput,
    chains: SupportedChain[] = queryableChains,
  ): Promise<(ProjectModel | FakeUnclaimedProject)[]> {
    // Define base SQL to query from multiple chains (schemas).
    const baseSQL = (schema: string) => `
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
    const queries = (chains || queryableChains).map(
      (chain) => baseSQL(chain) + whereClause + orderClause,
    );

    // Combine all schema queries with UNION.
    const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

    const projects = await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: ProjectModel,
    });

    const apiProjects = await Promise.all(
      Object.entries(projects)
        .flatMap(([_, p]) => p) // eslint-disable-line no-unused-vars
        .filter((p) => p.isValid)
        .filter((p) => (p.name ? isValidateProjectName(p.name) : true))
        .map(toApiProject),
    );

    return apiProjects.filter(Boolean) as (
      | ProjectModel
      | FakeUnclaimedProject
    )[];
  }

  public async getProjectsByIds(
    ids: ProjectId[],
    chain: SupportedChain,
  ): Promise<ProjectModel[]> {
    return this._batchProjectsByIds.loadMany(
      ids.map((id) => ({
        projectId: id,
        chain,
      })),
    ) as Promise<ProjectModel[]>;
  }

  public async getEarnedFunds(projectId: ProjectId): Promise<
    {
      tokenAddress: string;
      amount: string;
    }[]
  > {
    const amounts = await Promise.all([
      this._getIncomingSplitTotal(projectId),
      this._getIncomingGivesTotal(projectId),
    ]);

    return this._mergeAmounts(...amounts);
  }

  private async _getIncomingSplitTotal(accountId: string) {
    const incomingSplitEvents = await SplitEventModel.findAll({
      where: {
        receiver: accountId,
      },
    });

    return incomingSplitEvents.reduce<
      {
        tokenAddress: string;
        amount: bigint;
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
        });
      }

      return acc;
    }, []);
  }

  private async _getIncomingGivesTotal(accountId: string) {
    const incomingGiveEvents = await GivenEventModel.findAll({
      where: {
        receiver: accountId,
      },
    });

    return incomingGiveEvents.reduce<
      {
        tokenAddress: string;
        amount: bigint;
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
        });
      }

      return acc;
    }, []);
  }

  private async _mergeAmounts(
    ...args: {
      tokenAddress: string;
      amount: bigint;
    }[][]
  ) {
    const amounts = new Map<
      string,
      {
        tokenAddress: string;
        amount: bigint;
      }
    >();

    args.forEach((amountsArray) => {
      amountsArray.forEach((amount) => {
        const existingAmount = amounts.get(amount.tokenAddress);
        if (existingAmount) {
          amounts.set(amount.tokenAddress, {
            amount: existingAmount.amount + amount.amount,
            tokenAddress: amount.tokenAddress,
          });
        } else {
          amounts.set(amount.tokenAddress, amount);
        }
      });
    });

    return Array.from(amounts.values()).map((x) => ({
      amount: x.amount.toString(),
      tokenAddress: x.tokenAddress,
    }));
  }
}
