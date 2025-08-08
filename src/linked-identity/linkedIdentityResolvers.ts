import type { LinkedIdentity, SupportedChain } from '../generated/graphql';
import { Driver, LinkedIdentityType } from '../generated/graphql';
import type { Context } from '../server';
import { dbSchemaToChain, chainToDbSchema } from '../utils/chainSchemaMappings';
import type { Address, RepoDriverId } from '../common/types';
import type { LinkedIdentityDataValues } from './LinkedIdentityModel';
import queryableChains from '../common/queryableChains';

export const toLinkedIdentity = (
  linkedIdentityDataValues: LinkedIdentityDataValues[],
): LinkedIdentity | null => {
  if (linkedIdentityDataValues.length === 0) {
    return null;
  }

  // All items share the same accountId, so use first item to extract it.
  const firstIdentity = linkedIdentityDataValues[0];

  return {
    account: {
      driver: Driver.REPO,
      accountId: firstIdentity.accountId,
    },
    chainData: linkedIdentityDataValues.map((identity) => ({
      chain: dbSchemaToChain[identity.chain],
      identityType: LinkedIdentityType.ORCID,
      owner: {
        driver: Driver.ADDRESS,
        accountId: identity.ownerAccountId,
        address: identity.ownerAddress,
      },
      isLinked: identity.isLinked,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
    })),
  };
};

const linkedIdentitiesByOwner = async (
  _parent: unknown,
  { ownerAddress, chains }: { ownerAddress: string; chains?: SupportedChain[] },
  { dataSources }: Context,
) => {
  const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
    (chain) => chainToDbSchema[chain],
  );

  const linkedIdentityDataValues =
    await dataSources.linkedIdentitiesDataSource.getLinkedIdentitiesByOwnerAddress(
      dbSchemasToQuery,
      ownerAddress as Address,
    );

  // Group by accountId
  const groupedIdentities = linkedIdentityDataValues.reduce<
    Record<RepoDriverId, LinkedIdentityDataValues[]>
  >(
    (acc, identity) => {
      if (!acc[identity.accountId]) {
        acc[identity.accountId] = [];
      }
      acc[identity.accountId].push(identity);
      return acc;
    },
    {} as Record<RepoDriverId, LinkedIdentityDataValues[]>,
  );

  // Convert each group to a LinkedIdentity
  return Object.values(groupedIdentities)
    .map((group) => toLinkedIdentity(group))
    .filter(Boolean) as LinkedIdentity[];
};

const linkedIdentityResolvers = {
  Query: {
    linkedIdentitiesByOwner,
  },
};

export default linkedIdentityResolvers;
