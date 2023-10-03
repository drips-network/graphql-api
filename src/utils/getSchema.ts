import type { DbSchema } from '../common/types';
import config from '../common/config';

export default function getSchema(): DbSchema {
  return config.network as DbSchema;
}
