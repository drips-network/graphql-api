import type { DbSchema } from '../common/types';
import appSettings from '../common/appSettings';

export default function getSchema(): DbSchema {
  return appSettings.network as DbSchema;
}
