import type { AddressDriverId } from '../common/types';
import type { SupportedChain } from '../generated/graphql';
import { Driver } from '../generated/graphql';
import getUserAddress from './getUserAddress';
import getAssetConfigs from './getAssetConfigs';
import getLatestAccountMetadataByChain from './getLatestAccountMetadata';

export default async function getUserAccount(
  chains: SupportedChain[],
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
    SupportedChain,
    {
      user: {
        accountId: AddressDriverId;
        driver: Driver;
        address: string;
      };
      name: string | undefined;
      description: string | undefined;
      emoji: string | undefined;
      assetConfigs: Awaited<ReturnType<typeof getAssetConfigs>>[SupportedChain];
      lastUpdated: Date | undefined;
      lastUpdatedByAddress: string | undefined;
      lastIpfsHash: string | undefined;
    }
  >;

  Object.entries(assetConfigsByChain).forEach(([chain, assetConfigs]) => {
    const metadata =
      latestAccountMetadataByChain[chain as SupportedChain]?.metadata;
    const ipfsHash =
      latestAccountMetadataByChain[chain as SupportedChain]?.ipfsHash;

    response[chain as SupportedChain] = {
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
