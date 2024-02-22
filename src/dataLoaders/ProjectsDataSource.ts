import type { Order, WhereOptions } from 'sequelize';
import { Op } from 'sequelize';
import DataLoader from 'dataloader';
import ProjectModel from '../project/ProjectModel';
import type { FakeUnclaimedProject, ProjectId } from '../common/types';
import {
  doesRepoExists,
  isValidateProjectName,
  toApiProject,
  toFakeUnclaimedProjectFromUrl,
} from '../project/projectUtils';
import type { ProjectSortInput, ProjectWhereInput } from '../generated/graphql';
import SplitEventModel from '../models/SplitEventModel';
import GivenEventModel from '../given-event/GivenEventModel';

export default class ProjectsDataSource {
  private readonly _batchProjectsByIds = new DataLoader(
    async (projectIds: readonly ProjectId[]): Promise<ProjectModel[]> => {
      const projects = await ProjectModel.findAll({
        where: {
          id: {
            [Op.in]: projectIds,
          },
          isValid: true,
        },
      }).then((projectModels) =>
        projectModels.filter((p) =>
          p.name ? isValidateProjectName(p.name) : true,
        ),
      );

      const projectIdToProjectMap = projects.reduce<
        Record<ProjectId, ProjectModel>
      >((mapping, project) => {
        mapping[project.id] = project; // eslint-disable-line no-param-reassign

        return mapping;
      }, {});

      return projectIds.map((id) => projectIdToProjectMap[id]);
    },
  );

  public async getProjectById(
    id: ProjectId,
  ): Promise<ProjectModel | FakeUnclaimedProject | null> {
    return toApiProject(await this._batchProjectsByIds.load(id));
  }

  public async getProjectByUrl(
    url: string,
  ): Promise<ProjectModel | FakeUnclaimedProject | null> {
    const project = await ProjectModel.findOne({ where: { url } });

    if (project) {
      return toApiProject(project);
    }

    const exists = await doesRepoExists(url);

    return exists ? toFakeUnclaimedProjectFromUrl(url) : null;
  }

  public async getProjectsByFilter(
    where: ProjectWhereInput,
    sort?: ProjectSortInput,
  ): Promise<(ProjectModel | FakeUnclaimedProject)[]> {
    const order: Order = sort ? [[sort.field, sort.direction || 'DESC']] : [];

    const projects =
      (await ProjectModel.findAll({
        where: (where as WhereOptions) || {},
        order,
      })) || [];

    return projects
      .filter((p) => p.isValid)
      .filter((p) => (p.name ? isValidateProjectName(p.name) : true))
      .map(toApiProject)
      .filter(Boolean) as (ProjectModel | FakeUnclaimedProject)[];
  }

  public async getProjectsByIds(ids: ProjectId[]): Promise<ProjectModel[]> {
    return this._batchProjectsByIds.loadMany(ids) as Promise<ProjectModel[]>;
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
