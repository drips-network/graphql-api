import dripsContracts from '../common/dripsContracts';
import type { DbSchema, RepoDriverId } from '../common/types';
import { assertIsRepoDriverId, assertIsRepoSubAccountDriverId } from './assert';
import { dbSchemaToChain } from './chainSchemaMappings';
import shouldNeverHappen from './shouldNeverHappen';

export async function transformRepoDriverId(
  id: string,
  direction: 'toParent' | 'toSub',
  chain: DbSchema,
): Promise<RepoDriverId> {
  if (direction === 'toParent') {
    assertIsRepoSubAccountDriverId(id);
  } else {
    assertIsRepoDriverId(id);
  }

  const { repoSubAccountDriver } = dripsContracts[dbSchemaToChain[chain]]!;

  const transformedId = (await repoSubAccountDriver!.calcAccountId(id)) // TODO: Remove non-null assertion operator when RepoSubAccountDriver is deployed in all chains.
    .toString();

  if (direction === 'toParent') {
    assertIsRepoDriverId(transformedId);
  } else {
    assertIsRepoSubAccountDriverId(transformedId);
  }

  const recalculatedId = (
    await repoSubAccountDriver!.calcAccountId(transformedId)
  ) // TODO: Remove non-null assertion operator when RepoSubAccountDriver is deployed in all chains.
    .toString();

  if (recalculatedId !== id) {
    shouldNeverHappen(
      `Failed to transform RepoDriver ID: '${id}' does not match the recalculated ID '${recalculatedId}'.`,
    );
  }

  return transformedId as RepoDriverId;
}

export async function calcParentRepoDriverId(
  subAccountId: string,
  chain: DbSchema,
): Promise<RepoDriverId> {
  return transformRepoDriverId(subAccountId, 'toParent', chain);
}

export async function calcSubRepoDriverId(
  parentId: string,
  chain: DbSchema,
): Promise<RepoDriverId> {
  return transformRepoDriverId(parentId, 'toSub', chain);
}
