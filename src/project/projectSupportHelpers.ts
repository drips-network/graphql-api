import type { AccountId, DbSchema } from '../common/types';
import { isRepoDriverId } from '../utils/assert';
import { calcSubRepoDriverId } from '../utils/repoSubAccountIdUtils';
import type SupportDataSource from '../dataLoaders/SupportDataSource';

/**
 * Gets account IDs to query for project support (main account + sub-account if applicable)
 */
export async function getProjectAccountIdsToQuery(
  projectId: AccountId,
  projectChain: DbSchema,
): Promise<AccountId[]> {
  const accountIds = [projectId];

  if (isRepoDriverId(projectId)) {
    const subAccountId = await calcSubRepoDriverId(projectId, projectChain);
    accountIds.push(subAccountId);
  }

  return accountIds;
}

/**
 * Queries split support for a project (including both main and sub-account)
 */
export async function getProjectSplitSupport(
  projectId: AccountId,
  projectChain: DbSchema,
  supportDataSource: SupportDataSource,
) {
  const accountIdsForSplitSupport = await getProjectAccountIdsToQuery(
    projectId,
    projectChain,
  );

  const splitReceiversResults = await Promise.all(
    accountIdsForSplitSupport.map((accountId) =>
      supportDataSource.getSplitSupportByReceiverIdOnChain(
        accountId,
        projectChain,
      ),
    ),
  );

  return splitReceiversResults.flat();
}

/**
 * Queries one-time donation support for a project (including both main and sub-account)
 */
export async function getProjectOneTimeDonationSupport(
  projectId: AccountId,
  projectChain: DbSchema,
  supportDataSource: SupportDataSource,
) {
  const accountIdsToQuery = await getProjectAccountIdsToQuery(
    projectId,
    projectChain,
  );

  return supportDataSource.getOneTimeDonationSupportByAccountIdsOnChain(
    accountIdsToQuery,
    projectChain,
  );
}
