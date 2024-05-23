import type { Address, AddressDriverId } from '../common/types';
import { Driver } from '../generated/graphql';
import type { User } from '../generated/graphql';
import getUserAddress from '../utils/getUserAddress';
import getUserAccount from '../utils/getUserAccount';
import dripsContracts from '../common/dripsContracts';

export default class UsersDataSource {
  public async getUserAccount(accountId: AddressDriverId) {
    return getUserAccount(accountId);
  }

  public async getUserByAccountId(accountId: AddressDriverId): Promise<User> {
    return {
      account: {
        accountId,
        address: getUserAddress(accountId),
        driver: Driver.ADDRESS,
      },
      projects: [],
      dripLists: [],
      streams: {
        outgoing: [],
        incoming: [],
      },
      balances: [],
    };
  }

  public async getUserByAddress(address: Address): Promise<User> {
    const {
      contracts: { addressDriver },
    } = dripsContracts;

    const accountId = (await addressDriver.calcAccountId(address)).toString();

    return this.getUserByAccountId(accountId as AddressDriverId);
  }
}
