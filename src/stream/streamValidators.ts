import { isAccountId } from '../utils/assert';
import { validateChainsQueryArg } from '../utils/commonInputValidators';
import type streamResolvers from './streamResolvers';

export default function verifyStreamsInput(
  dripsListsQueryArgs: Parameters<typeof streamResolvers.Query.streams>[1],
) {
  const { where, chains } = dripsListsQueryArgs;

  if (where?.receiverId && !isAccountId(where.receiverId)) {
    throw new Error('Invalid receiver id.');
  }

  if (where?.senderId && !isAccountId(where.senderId)) {
    throw new Error('Invalid sender id.');
  }

  if (chains?.length) {
    validateChainsQueryArg(chains);
  }
}
