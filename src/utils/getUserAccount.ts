import type { AddressDriverId } from '../common/types';
import { Driver } from '../generated/graphql';
import getUserAddress from './getUserAddress';
import getLatestAccountMetadata from './getLatestAccountMetadata';
import getAssetConfigs from './getAssetConfigs';

export default async function getUserAccount(accountId: AddressDriverId) {
  const { metadata, ipfsHash } =
    (await getLatestAccountMetadata(accountId)) ?? {};

  const assetConfigs = await getAssetConfigs(accountId, metadata);

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
