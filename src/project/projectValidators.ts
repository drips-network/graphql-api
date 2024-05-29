import { isAddress } from 'ethers';
import { SupportedChain } from '../generated/graphql';
import type { ProjectSortInput, ProjectWhereInput } from '../generated/graphql';
import assert, {
  isGitHubUrl,
  isProjectId,
  isProjectVerificationStatus,
} from '../utils/assert';

function isSortableProjectField(field: string): boolean {
  return ['claimedAt'].includes(field);
}

export default function verifyProjectsInput(input: {
  chains: SupportedChain[];
  where: ProjectWhereInput;
  sort: ProjectSortInput;
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

  if (sort?.field === 'claimedAt') {
    assert(isSortableProjectField(sort.field));
  }

  if (chains) {
    chains.forEach((chain) => {
      assert(chain in SupportedChain);
    });
  }
}
