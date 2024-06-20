import type { AddressDriverId, DbSchema } from '../common/types';
import { Driver } from '../generated/graphql';
import getUserAddress from './getUserAddress';
import getAssetConfigs from './getAssetConfigs';
import getLatestAccountMetadataByChain from './getLatestAccountMetadata';

export default async function getUserAccount(
  chains: DbSchema[],
  accountId: AddressDriverId,
) {
  const latestAccountMetadataByChain =
    (await getLatestAccountMetadataByChain(chains, accountId)) ?? {};

  const assetConfigsByChain = await getAssetConfigs(
    accountId,
    latestAccountMetadataByChain,
    chains,
  );

  const response = {} as Record<
    DbSchema,
    {
      user: {
        accountId: AddressDriverId;
        driver: Driver;
        address: string;
      };
      name: string | undefined;
      description: string | undefined;
      emoji: string | undefined;
      assetConfigs: Awaited<ReturnType<typeof getAssetConfigs>>[DbSchema];
      lastUpdated: Date | undefined;
      lastUpdatedByAddress: string | undefined;
      lastIpfsHash: string | undefined;
    }
  >;

  Object.entries(assetConfigsByChain).forEach(([chain, assetConfigs]) => {
    const metadata = latestAccountMetadataByChain[chain as DbSchema]?.metadata;
    const ipfsHash = latestAccountMetadataByChain[chain as DbSchema]?.ipfsHash;

    response[chain as DbSchema] = {
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
  });

  return response;
}
