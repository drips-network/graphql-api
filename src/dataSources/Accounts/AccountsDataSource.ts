import type { AddressDriverId } from '../../common/types';
import { Driver } from '../../generated/graphql';
import type { UserAccount } from '../../generated/graphql';
import getUserAddress from '../../utils/getUserAddress';
import groupBy from '../../utils/linq';
import buildAssetConfigs from './buildStreams';
import getStreamsSetEventsWithReceivers from './getStreamsSetEventsWithReceivers';
import getLatestAccountMetadata from './getLatestAccountMetadata';

export default class AccountsDataSource {
  public async getStreamsByAccountId(
    accountId: AddressDriverId,
  ): Promise<UserAccount> {
    const { metadata, ipfsHash } = await getLatestAccountMetadata(accountId);

    const accountStreamsSetEventsWithReceivers =
      await getStreamsSetEventsWithReceivers(accountId);

    const accountStreamsSetEventsWithReceiversByErc20 = groupBy(
      accountStreamsSetEventsWithReceivers,
      (event) => event.erc20,
    );

    const assetConfigs = buildAssetConfigs(
      accountId,
      metadata,
      accountStreamsSetEventsWithReceiversByErc20,
    );

    return {
      user: {
        accountId,
        driver: Driver.ADDRESS,
        address: getUserAddress(accountId),
      },
      name: metadata?.name,
      description: metadata?.description,
      emoji: metadata?.emoji,
      assetConfigs: assetConfigs ?? [],
      lastUpdated: metadata ? new Date(metadata.timestamp * 1000) : undefined,
      lastUpdatedByAddress: metadata?.writtenByAddress,
      lastIpfsHash: ipfsHash,
    };
  }
}
