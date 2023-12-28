import type { AddressDriverId } from '../common/types';
import type { UserAccount } from '../generated/graphql';
import { Driver } from '../generated/graphql';
import getUserAddress from './getUserAddress';
import groupBy from './linq';
import buildAssetConfigs from './buildStreams';
import getLatestAccountMetadata from './getLatestAccountMetadata';
import getStreamsSetEventsWithReceivers from './getStreamsSetEventsWithReceivers';

export default async function getUserAccount(
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
