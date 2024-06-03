import type { Address, AddressDriverId, ResolverUser } from '../common/types';
import type { SupportedChain } from '../generated/graphql';
import getUserAccount from '../utils/getUserAccount';
import { getCrossChainAddressDriverAccountIdByAddress } from '../common/dripsContracts';
import toResolverUsers from './userUtils';

export default class UsersDataSource {
  public async getUserAccount(
    chains: SupportedChain[],
    accountId: AddressDriverId,
  ) {
    return getUserAccount(chains, accountId);
  }

  public async getUserByAccountId(
    chains: SupportedChain[],
    accountId: AddressDriverId,
  ): Promise<ResolverUser> {
    return toResolverUsers(chains, accountId);
  }

  public async getUserByAddress(
    chains: SupportedChain[],
    address: Address,
  ): Promise<ResolverUser> {
    const accountId =
      await getCrossChainAddressDriverAccountIdByAddress(address);

    return this.getUserByAccountId(chains, accountId as AddressDriverId);
  }
}
