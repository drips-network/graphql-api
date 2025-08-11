import type { OrcidAccountSortInput } from '../generated/graphql';

export const orcidAccountSortFields = ['createdAt'] as const;

function isSortableOrcidAccountField(field: string): boolean {
  return orcidAccountSortFields.includes(
    field as (typeof orcidAccountSortFields)[number],
  );
}

export default function validateOrcidAccountsInput({
  sort,
  limit,
}: {
  sort?: OrcidAccountSortInput;
  limit?: number;
}): void {
  if (sort?.field && !isSortableOrcidAccountField(sort.field)) {
    throw new Error(
      `Invalid sort field: ${sort.field}. Valid fields are: ${orcidAccountSortFields.join(', ')}`,
    );
  }

  if (limit !== undefined && (limit < 1 || limit > 1000)) {
    throw new Error('Limit must be between 1 and 1000');
  }
}
