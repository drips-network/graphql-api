import DataLoader from 'dataloader';
import type { ProjectDataValues } from '../project/ProjectModel';
import type {
  AccountId,
  DbSchema,
  RepoDriverId,
  RepoDriverMultiChainKey,
} from '../common/types';
import {
  doesRepoExists,
  toApiProject,
  toProjectRepresentationFromUrl,
  toProjectRepresentationFromUrlWithDbFallback,
} from '../project/projectUtils';
import { getCrossChainRepoDriverAccountIdByAddress } from '../common/dripsContracts';
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
import { dbSchemaToChain } from '../utils/chainSchemaMappings';
import extractProjectInfoFromUrl from '../utils/extractProjectInfoFromUrl';

export default class ProjectsDataSource {
  private readonly _batchProjectsByIds = new DataLoader(
    async (
      projectKeys: readonly RepoDriverMultiChainKey[],
    ): Promise<(ProjectDataValues | null)[]> => {
      const { chains, ids: projectIds } = parseMultiChainKeys(projectKeys);

      const projectsDataValues = await projectsQueries.getByIds(
        chains,
        projectIds,
      );

      const apiProjectsDataValues = await Promise.all(
        projectsDataValues.map((p) => toApiProject(p)),
      );

      const filteredProjectsDataValues = apiProjectsDataValues.filter(
        Boolean,
      ) as ProjectDataValues[];

      const projectIdToProjectMap = filteredProjectsDataValues.reduce<
        Record<RepoDriverId, ProjectDataValues>
      >((mapping, project) => {
        mapping[project.accountId] = project; // eslint-disable-line no-param-reassign

        return mapping;
      }, {});

      return projectIds.map((id) => projectIdToProjectMap[id] || null);
    },
  );

  public async getProjectByIdOnChain(
    accountId: RepoDriverId,
    chain: DbSchema,
  ): Promise<ProjectDataValues | null> {
    const dbProject = await this._batchProjectsByIds.load({
      accountId,
      chains: [chain],
    });

    return dbProject ?? null;
  }

  public async getProjectById(
    accountId: RepoDriverId,
    chains: DbSchema[],
  ): Promise<ProjectDataValues[] | null> {
    const dbProjects = (
      await this._batchProjectsByIds.loadMany([{ accountId, chains }])
    ).filter(Boolean) as ProjectDataValues[];

    if (!dbProjects?.length) {
      return null;
    }

    if (dbProjects.some((p) => p.accountId !== dbProjects[0].accountId)) {
      shouldNeverHappen(
        'Found same project with different ids on different chains.',
      );
    }

    // Filter out projects that don't have a name and forge (yet).
    // This can happen if `OwnerUpdated` event processed but `AccountMetadataEmitted` not yet.
    return dbProjects.filter((p) => p.name && p.forge);
  }

  public async getProjectByUrl(
    url: string,
    chains: DbSchema[],
  ): Promise<ProjectDataValues[] | null> {
    // TODO: To Data Loader.

    if (!(await doesRepoExists(url))) {
      return null;
    }

    // First, try to find projects by URL (for projects that have URL populated)
    let dbProjects = await projectsQueries.getByUrl(chains, url);

    // If no projects found by URL, try to find by calculated accountId
    // This handles the case where projects exist in DB but don't have URL populated yet
    if (!dbProjects?.length) {
      const { forge, projectName } = extractProjectInfoFromUrl(url);
      const accountId = await getCrossChainRepoDriverAccountIdByAddress(
        forge,
        projectName,
        chains,
      );

      dbProjects = await projectsQueries.getByIds(chains, [accountId]);

      // If still no projects found, create from URL
      if (!dbProjects?.length) {
        return [await toProjectRepresentationFromUrl(url, chains)];
      }
    }

    if (dbProjects.some((p) => p.accountId !== dbProjects[0].accountId)) {
      shouldNeverHappen(
        'Found same project with different ids on different chains.',
      );
    }

    // Check if any projects have name and forge
    const validProjects = dbProjects.filter((p) => p.name && p.forge);

    if (validProjects.length > 0) {
      // We have complete projects, return them
      return validProjects;
    }

    // We have incomplete projects (missing name/forge) but potentially with owner info
    // Create representation from URL but merge with DB owner data
    return [
      await toProjectRepresentationFromUrlWithDbFallback(
        url,
        chains,
        dbProjects,
      ),
    ];
  }

  public async getProjectsByFilter(
    chains: DbSchema[],
    where?: ProjectWhereInput,
    sort?: ProjectSortInput,
    limit?: number,
  ): Promise<ProjectDataValues[]> {
    const projectsDataValues = await projectsQueries.getByFilter(
      chains,
      where,
      sort,
      limit,
    );

    return Promise.all(
      projectsDataValues
        .map((p) => toApiProject(p))
        .filter(Boolean) as ProjectDataValues[],
    );
  }

  public async getProjectsByIdsOnChain(
    ids: RepoDriverId[],
    chain: DbSchema,
  ): Promise<ProjectDataValues[]> {
    return (
      await (this._batchProjectsByIds.loadMany(
        ids.map((id) => ({
          accountId: id,
          chains: [chain],
        })),
      ) as Promise<ProjectDataValues[]>)
    ).filter((p) => p && p.chain === chain);
  }

  public async getEarnedFunds(
    projectId: RepoDriverId,
    chains: DbSchema[],
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
    chains: DbSchema[],
  ) {
    const incomingSplitEventModelDataValues =
      await splitEventsQueries.getByReceiver(chains, accountId);

    return incomingSplitEventModelDataValues.reduce<
      {
        tokenAddress: string;
        amount: bigint;
        chain: DbSchema;
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
    chains: DbSchema[],
  ) {
    const incomingGivenEventModelDataValues =
      await givenEventsQueries.getByReceiver(chains, accountId);

    return incomingGivenEventModelDataValues.reduce<
      {
        tokenAddress: string;
        amount: bigint;
        chain: DbSchema;
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
      chain: DbSchema;
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
            chain: dbSchemaToChain[amount.chain],
            amount: existingAmount.amount + amount.amount,
          });
        } else {
          amounts.set(key, {
            ...amount,
            chain: dbSchemaToChain[amount.chain],
          });
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
