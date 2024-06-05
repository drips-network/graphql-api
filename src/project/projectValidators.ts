import { isAddress } from 'ethers';
import type {
  SupportedChain,
  ProjectSortInput,
  ProjectWhereInput,
} from '../generated/graphql';
import assert, {
  isGitHubUrl,
  isProjectId,
  isProjectVerificationStatus,
} from '../utils/assert';
import { validateChainsInput } from '../utils/inputValidators';

function isSortableProjectField(field: string): boolean {
  return ['claimedAt'].includes(field);
}

export default function validateProjectsInput(input: {
  chains?: SupportedChain[];
  where?: ProjectWhereInput;
  sort?: ProjectSortInput;
}) {
  const { where, sort, chains } = input;

  if (where?.id) {
    assert(isProjectId(where.id));
  }

  if (where?.ownerAddress) {
    assert(isAddress(where.ownerAddress));
  }

  if (where?.url) {
    assert(isGitHubUrl(where.url));
  }

  if (where?.verificationStatus) {
    assert(isProjectVerificationStatus(where.verificationStatus));
  }

  if (sort?.field) {
    assert(isSortableProjectField(sort.field));
  }

  if (chains?.length) {
    validateChainsInput(chains);
  }
}
