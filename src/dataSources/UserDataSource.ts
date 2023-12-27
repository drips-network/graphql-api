import appSettings from '../common/appSettings';
import provider from '../common/provider';
import type { Address, AddressDriverId } from '../common/types';
import { AddressDriver__factory } from '../generated/contracts';
import { Driver, type Stream, type User } from '../generated/graphql';
import StreamReceiverSeenEventModel from '../models/StreamReceiverSeenEventModel';
import { assertAddressDiverId } from '../utils/assert';
import getUserAddress from '../utils/getUserAddress';
import AccountsDataSource from './Accounts/AccountsDataSource';

export default class UsersDataSource {
  public async getUserByAccountId(accountId: AddressDriverId): Promise<User> {
    return {
      account: {
        accountId,
        address: getUserAddress(accountId),
        driver: Driver.ADDRESS,
      },
      streams: {
        outgoing: [],
        incoming: [],
      },
      projects: [],
      dripLists: [],
    };
  }

  public async getUserIncomingStreams(
    accountId: AddressDriverId,
  ): Promise<Stream[]> {
    const accountsDataSource = new AccountsDataSource();

    // For the incoming streams:
    const streamReceiverSeenEventsForUser =
      await StreamReceiverSeenEventModel.findAll({
        where: {
          accountId,
        },
      });
    const accountIdsStreamingToUser = streamReceiverSeenEventsForUser.reduce<
      string[]
    >((acc, event) => {
      const receiverId = event.accountId.toString();
      return !acc.includes(receiverId) ? [...acc, receiverId] : acc;
    }, []);

    const accountsStreamingToUser = await Promise.all(
      accountIdsStreamingToUser.map((id) => {
        assertAddressDiverId(id);
        return accountsDataSource.getUserAccount(id);
      }),
    );

    const incomingStreams = accountsStreamingToUser.reduce<Stream[]>(
      (acc, account) => {
        const streams = account.assetConfigs
          .flatMap((assetConfig) => assetConfig.streams)
          .filter((stream) => stream.receiver.accountId === accountId);

        return [...acc, ...streams];
      },
      [],
    );

    return incomingStreams;
  }

  public async getUserOutgoingStreams(
    accountId: AddressDriverId,
  ): Promise<Stream[]> {
    const accountsDataSource = new AccountsDataSource();

    const userAccount = await accountsDataSource.getUserAccount(accountId);
    const outgoingStreams = userAccount.assetConfigs.flatMap(
      (assetConfig) => assetConfig.streams,
    );

    return outgoingStreams;
  }

  public async getUserByAccountAddress(address: Address): Promise<User> {
    const addressDriver = AddressDriver__factory.connect(
      appSettings.addressDriverAddress,
      provider,
    );

    const accountId = (await addressDriver.calcAccountId(address)).toString();

    assertAddressDiverId(accountId);

    return this.getUserByAccountId(accountId);
  }
}
