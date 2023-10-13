import type { Forge as DbForge } from '../common/types';
import { Forge as ApiForge } from '../generated/graphql';
import shouldNeverHappen from '../utils/shouldNeverHappen';

export default function toApiForge(forge: DbForge): ApiForge {
  switch (forge) {
    case 'GitHub':
      return ApiForge.GitHub;
    case 'GitLab':
      return ApiForge.GitLab;
    default:
      return shouldNeverHappen(forge);
  }
}
