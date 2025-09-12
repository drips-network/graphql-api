import type {
  DbSchema,
  LinkedIdentityId,
  NftDriverId,
  RepoDriverId,
  ResolverClaimedProjectData,
  ResolverDripListData,
  ResolverEcosystemData,
  ResolverUnClaimedProjectData,
} from './types';
import type { Context } from '../server';
import mergeAmounts from '../utils/mergeAmounts';
import splitEventsQueries from '../dataLoaders/sqlQueries/splitEventsQueries';
import type SplitsReceiverModel from '../models/SplitsReceiverModel';
import type { OrcidLinkedIdentity as GqlOrcidLinkedIdentity } from '../generated/graphql';
import { assertIsLinkedIdentityId } from '../utils/assert';
import { chainToDbSchema } from '../utils/chainSchemaMappings';

export async function resolveTotalSplit(
  chains: DbSchema[],
  { senderAccountId, receiverAccountId }: SplitsReceiverModel,
) {
  const splitEvents = await splitEventsQueries.getByAccountIdAndReceiver(
    chains,
    senderAccountId,
    receiverAccountId,
  );

  return mergeAmounts(
    splitEvents.map((splitEvent) => ({
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
    | ResolverClaimedProjectData
    | ResolverUnClaimedProjectData
    | ResolverDripListData
    | ResolverEcosystemData
    | GqlOrcidLinkedIdentity,
  context: Context,
) {
  let accountId: RepoDriverId | NftDriverId | LinkedIdentityId;
  let chain: DbSchema;
  if ('parentProjectInfo' in entityData) {
    accountId = entityData.parentProjectInfo.projectId;
    chain = entityData.parentProjectInfo.projectChain;
  } else if ('parentDripListInfo' in entityData) {
    accountId = entityData.parentDripListInfo.dripListId;
    chain = entityData.parentDripListInfo.dripListChain;
  } else if ('isLinked' in entityData) {
    assertIsLinkedIdentityId(entityData.account.accountId);
    accountId = entityData.account.accountId;
    chain = chainToDbSchema[entityData.chain];
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
