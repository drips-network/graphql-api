import { isAddress } from 'ethers';
import { SortDirection } from '../generated/graphql';
import {
  isGitHubUrl,
  isRepoDriverId,
  isProjectVerificationStatus,
} from '../utils/assert';
import { validateChainsQueryArg } from '../utils/commonInputValidators';
import type projectResolvers from './projectResolvers';

function isSortableProjectField(field: string): boolean {
  return ['claimed_at'].includes(field);
}

export default function validateProjectsInput(
  projectsQueryArgs: Parameters<typeof projectResolvers.Query.projects>[1],
) {
  const { where, sort, chains } = projectsQueryArgs;

  if (where?.accountId && !isRepoDriverId(where.accountId)) {
    throw new Error('Invalid project id.');
  }

  if (where?.ownerAddress && !isAddress(where.ownerAddress)) {
    throw new Error('Invalid owner address.');
  }

  if (where?.url && !isGitHubUrl(where.url)) {
    throw new Error('Invalid GitHub URL.');
  }

  if (
    where?.verificationStatus &&
    !isProjectVerificationStatus(where.verificationStatus)
  ) {
    throw new Error('Invalid verification status.');
  }

  if (sort?.field && !isSortableProjectField(sort.field)) {
    throw new Error('Invalid sort field.');
  }

  if (sort?.direction && sort.direction in Object.values(SortDirection)) {
    throw new Error('Invalid sort direction.');
  }

  if (chains?.length) {
    validateChainsQueryArg(chains);
  }
}
