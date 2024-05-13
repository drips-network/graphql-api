import appSettings from '../common/appSettings';
import provider from '../common/provider';
import type { Address, AddressDriverId } from '../common/types';
import { AddressDriver__factory } from '../generated/contracts';
import { Driver } from '../generated/graphql';
import type { User, UserAccount } from '../generated/graphql';
import getUserAddress from '../utils/getUserAddress';
import getUserAccount from '../utils/getUserAccount';

export default class UsersDataSource {
  public async getUserAccount(
    accountId: AddressDriverId,
  ): Promise<UserAccount> {
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
    const addressDriver = AddressDriver__factory.connect(
      appSettings.addressDriverAddress,
      provider,
    );

    const accountId = (await addressDriver.calcAccountId(address)).toString();

    return this.getUserByAccountId(accountId as AddressDriverId);
  }
}
