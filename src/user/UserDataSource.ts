import type { AddressDriverId, DbSchema } from '../common/types';
import getUserAccount from '../utils/getUserAccount';

export default class UsersDataSource {
  public async getUserAccount(chains: DbSchema[], accountId: AddressDriverId) {
    return getUserAccount(chains, accountId);
  }
}
