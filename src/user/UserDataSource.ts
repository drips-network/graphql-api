import type { AddressDriverId } from '../common/types';
import type { SupportedChain } from '../generated/graphql';
import getUserAccount from '../utils/getUserAccount';

export default class UsersDataSource {
  public async getUserAccount(
    chains: SupportedChain[],
    accountId: AddressDriverId,
  ) {
    return getUserAccount(chains, accountId);
  }
}
