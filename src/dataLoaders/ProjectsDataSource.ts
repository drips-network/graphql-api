import { Op, QueryTypes } from 'sequelize';
import DataLoader from 'dataloader';
import ProjectModel from '../project/ProjectModel';
import type { ProjectDataValues, ProjectId } from '../common/types';
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
import SplitEventModel from '../models/SplitEventModel';
import GivenEventModel from '../given-event/GivenEventModel';
import { dbConnection } from '../database/connectToDatabase';

export default class ProjectsDataSource {
  private readonly _batchProjectsByIds = new DataLoader(
    async (projectIds: readonly ProjectId[]): Promise<ProjectDataValues[]> => {
      const projects = await ProjectModel.findAll({
        where: {
          id: {
            [Op.in]: projectIds,
          },
          isValid: true,
        },
      }).then((projectModels) =>
        projectModels.filter((p) =>
          p.name ? isValidProjectName(p.name) : true,
        ),
      );

      const projectIdToProjectMap = projects.reduce<
        Record<ProjectId, ProjectDataValues>
      >((mapping, project) => {
        mapping[project.id] = project.dataValues as ProjectDataValues; // eslint-disable-line no-param-reassign

        return mapping;
      }, {});

      return projectIds.map((id) => projectIdToProjectMap[id]);
    },
  );

  public async getProjectById(
    id: ProjectId,
  ): Promise<ProjectDataValues | null> {
    return toApiProject(await this._batchProjectsByIds.load(id));
  }

  public async getProjectByUrl(url: string): Promise<ProjectDataValues | null> {
    const project = (await ProjectModel.findOne({ where: { url } }))
      ?.dataValues as ProjectDataValues;

    if (project) {
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
  ): Promise<ProjectDataValues[]> {
    return this._batchProjectsByIds.loadMany(ids) as Promise<
      ProjectDataValues[]
    >;
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
