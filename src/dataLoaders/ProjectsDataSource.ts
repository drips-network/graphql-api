import DataLoader from 'dataloader';
import type { ProjectDataValues } from '../project/ProjectModel';
import type {
  AccountId,
  ProjectId,
  ProjectMultiChainKey,
} from '../common/types';
import { toApiProject } from '../project/projectUtils';
import type {
  ProjectSortInput,
  ProjectWhereInput,
  SupportedChain,
} from '../generated/graphql';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import projectsQueries from './sqlQueries/projectsQueries';
import givenEventsQueries from './sqlQueries/givenEventsQueries';
import splitEventsQueries from './sqlQueries/splitEventsQueries';
import shouldNeverHappen from '../utils/shouldNeverHappen';

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

  public async getProjectByIdOnChain(
    id: ProjectId,
    chain: SupportedChain,
  ): Promise<ProjectDataValues | null> {
    const dbProject = await this._batchProjectsByIds.load({
      id,
      chains: [chain],
    });

    return dbProject ?? null;
  }

  public async getProjectById(
    id: ProjectId,
    chains: SupportedChain[],
  ): Promise<ProjectDataValues[] | null> {
    const dbProjects = (
      await this._batchProjectsByIds.loadMany([{ id, chains }])
    ).filter(Boolean) as ProjectDataValues[];

    if (!dbProjects?.length) {
      return null;
    }

    if (dbProjects.some((p) => p.id !== dbProjects[0].id)) {
      shouldNeverHappen(
        'Found same project with different ids on different chains.',
      );
    }

    return dbProjects;
  }

  public async getProjectByUrl(
    url: string,
    chains: SupportedChain[],
  ): Promise<ProjectDataValues[] | null> {
    // TODO: To Data Loader.
    const dbProjects = await projectsQueries.getByUrl(chains, url);

    if (!dbProjects?.length) {
      return null;
    }

    if (dbProjects.some((p) => p.id !== dbProjects[0].id)) {
      shouldNeverHappen(
        'Found same project with different ids on different chains.',
      );
    }

    return dbProjects;
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
        .map(toApiProject)
        .filter(Boolean) as ProjectDataValues[],
    );
  }

  public async getProjectsByIdsOnChain(
    ids: ProjectId[],
    chain: SupportedChain,
  ): Promise<ProjectDataValues[]> {
    return (
      await (this._batchProjectsByIds.loadMany(
        ids.map((id) => ({
          id,
          chains: [chain],
        })),
      ) as Promise<ProjectDataValues[]>)
    ).filter((p) => p.chain === chain);
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
    accountId: AccountId,
    chains: SupportedChain[],
  ) {
    const incomingSplitEventModelDataValues =
      await splitEventsQueries.getByReceiver(chains, accountId);

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
