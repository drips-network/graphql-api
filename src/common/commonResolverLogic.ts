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
import SplitEventModel from '../models/SplitEventModel';
import { SupportedChain } from '../generated/graphql';

export async function resolveTotalSplit(
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

  const splitEvents = await SplitEventModel.findAll({
    where: {
      accountId: incomingAccountId,
      receiver: recipientAccountId,
    },
  });

  return mergeAmounts(
    splitEvents.map((splitEvent) => ({
      tokenAddress: splitEvent.erc20,
      amount: BigInt(splitEvent.amt),
      chain: SupportedChain.sepolia, // TODO: Only for compilation.
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
