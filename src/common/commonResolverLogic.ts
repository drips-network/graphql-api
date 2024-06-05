import { QueryTypes } from 'sequelize';
import type {
  DripListId,
  ProjectId,
  ResolverDripListData,
  ResolverUnClaimedProjectData,
} from './types';
import type { Context } from '../server';
import mergeAmounts from '../utils/mergeAmounts';
import DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';
import RepoDriverSplitReceiverModel from '../models/RepoDriverSplitReceiverModel';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { SplitEventModelDataValues } from '../models/SplitEventModel';
import SplitEventModel from '../models/SplitEventModel';
import type { SupportedChain } from '../generated/graphql';
import { dbConnection } from '../database/connectToDatabase';

export async function resolveTotalSplit(
  chains: SupportedChain[],
  parent: DripListSplitReceiverModel | RepoDriverSplitReceiverModel,
) {
  let incomingAccountId: DripListId | ProjectId;
  let recipientAccountId: DripListId | ProjectId;

  if (parent instanceof DripListSplitReceiverModel) {
    const { fundeeDripListId, funderDripListId, funderProjectId } = parent;
    recipientAccountId = fundeeDripListId;
    incomingAccountId =
      funderDripListId || funderProjectId || shouldNeverHappen();
  } else if (parent instanceof RepoDriverSplitReceiverModel) {
    const { fundeeProjectId, funderDripListId, funderProjectId } = parent;
    recipientAccountId = fundeeProjectId;
    incomingAccountId =
      funderDripListId || funderProjectId || shouldNeverHappen();
  } else {
    shouldNeverHappen('Invalid SupportItem type');
  }

  const baseSQL = (schema: SupportedChain) =>
    `SELECT *, '${schema}' AS chain FROM "${schema}"."SplitEvents"`;

  // Initialize the WHERE clause parts.
  const conditions: string[] = [
    '"accountId" = :accountId',
    '"receiver" = :receiver',
  ];
  const parameters: { [receiver: string]: any } = {
    accountId: incomingAccountId,
    receiver: recipientAccountId,
  };

  // Create the WHERE clause.
  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  // Build the SQL for each specified schema.
  const queries = chains.map((chain) => baseSQL(chain) + whereClause);

  // Combine all schema queries with UNION.
  const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

  const splitEventModelDataValues = (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: SplitEventModel,
    })
  ).map((p) => p.dataValues as SplitEventModelDataValues);

  return mergeAmounts(
    splitEventModelDataValues.map((splitEvent) => ({
      tokenAddress: splitEvent.erc20,
      amount: BigInt(splitEvent.amt),
      chain: splitEvent.chain,
    })),
  ).map((amount) => ({
    ...amount,
    amount: amount.amount.toString(),
  }));
}

export async function resolveTotalEarned(
  projectOrDripListData: ResolverUnClaimedProjectData | ResolverDripListData,
  _: any,
  context: Context,
) {
  let accountId: ProjectId | DripListId;
  let chain: SupportedChain;
  if ('parentProjectInfo' in projectOrDripListData) {
    accountId = projectOrDripListData.parentProjectInfo.projectId;
    chain = projectOrDripListData.parentProjectInfo.projectChain;
  } else {
    accountId = projectOrDripListData.parentDripListInfo.dripListId;
    chain = projectOrDripListData.parentDripListInfo.dripListChain;
  }

  const { totalEarnedDb } = context.dataSources;

  const { splitEventsForDripListDataValues, givenEventsForDripListDataValues } =
    await totalEarnedDb.getTotalEarnedByProjectIds(accountId, [chain]);

  return mergeAmounts(
    [
      ...splitEventsForDripListDataValues.filter((e) => e.chain === chain),
      ...givenEventsForDripListDataValues.filter((e) => e.chain === chain),
    ].map((event) => ({
      tokenAddress: event.erc20,
      amount: BigInt(event.amt),
      chain: event.chain,
    })),
  ).map((amount) => ({
    ...amount,
    amount: amount.amount.toString(),
  }));
}
