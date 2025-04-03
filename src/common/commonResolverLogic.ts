import type {
  DbSchema,
  NftDriverId,
  RepoDriverId,
  ResolverDripListData,
  ResolverEcosystemData,
  ResolverUnClaimedProjectData,
} from './types';
import type { Context } from '../server';
import mergeAmounts from '../utils/mergeAmounts';
import DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';
import RepoDriverSplitReceiverModel from '../models/RepoDriverSplitReceiverModel';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import splitEventsQueries from '../dataLoaders/sqlQueries/splitEventsQueries';

export async function resolveTotalSplit(
  chains: DbSchema[],
  parent: DripListSplitReceiverModel | RepoDriverSplitReceiverModel,
) {
  let incomingAccountId: NftDriverId | RepoDriverId;
  let recipientAccountId: NftDriverId | RepoDriverId;

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
    await splitEventsQueries.getByAccountIdAndReceiver(
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
  entityData:
    | ResolverUnClaimedProjectData
    | ResolverDripListData
    | ResolverEcosystemData,
  context: Context,
) {
  let accountId: RepoDriverId | NftDriverId;
  let chain: DbSchema;
  if ('parentProjectInfo' in entityData) {
    accountId = entityData.parentProjectInfo.projectId;
    chain = entityData.parentProjectInfo.projectChain;
  } else if ('parentDripListInfo' in entityData) {
    accountId = entityData.parentDripListInfo.dripListId;
    chain = entityData.parentDripListInfo.dripListChain;
  } else {
    accountId = entityData.parentEcosystemInfo.ecosystemId;
    chain = entityData.parentEcosystemInfo.ecosystemChain;
  }

  const { totalEarnedDataSource } = context.dataSources;

  const { splitEventsForAccountDataValues, givenEventsForAccountDataValues } =
    await totalEarnedDataSource.getTotalEarnedByAccountIds(accountId, [chain]);

  return mergeAmounts(
    [
      ...splitEventsForAccountDataValues.filter((e) => e.chain === chain),
      ...givenEventsForAccountDataValues.filter((e) => e.chain === chain),
    ].map((event) => ({
      tokenAddress: event.erc20,
      amount: BigInt(event.amt),
      chain: event.chain,
    })),
  ).map((amount) => ({
    ...amount,
    amount: amount.amount.toString(),
    chain,
  }));
}
