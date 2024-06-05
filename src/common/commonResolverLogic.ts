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
import type { SupportedChain } from '../generated/graphql';
import sqlQueries from '../utils/sqlQueries';

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

  const splitEventModelDataValues =
    await sqlQueries.events.getSplitEventsByAccountIdAndReceiver(
      chains,
      incomingAccountId,
      recipientAccountId,
    );

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