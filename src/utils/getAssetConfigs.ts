import type { AddressDriverId } from '../common/types';
import type { SupportedChain } from '../generated/graphql';
import buildAssetConfigs from './buildAssetConfigs';
import type getLatestAccountMetadataByChain from './getLatestAccountMetadata';
import getStreamsSetEventsWithReceivers from './getStreamsSetEventsWithReceivers';
import groupBy from './linq';

export default async function getAssetConfigs(
  accountId: AddressDriverId,
  accountMetadata: NonNullable<
    Awaited<ReturnType<typeof getLatestAccountMetadataByChain>>
  >,
): Promise<Record<SupportedChain, ReturnType<typeof buildAssetConfigs>>> {
  const chainsToQuery = Object.keys(accountMetadata) as SupportedChain[];

  if (!chainsToQuery.length) {
    return {} as Record<SupportedChain, ReturnType<typeof buildAssetConfigs>>;
  }

  const accountStreamsSetEventsWithReceivers =
    await getStreamsSetEventsWithReceivers(chainsToQuery, accountId);

  const accountStreamsSetEventsWithReceiversByErc20 = groupBy(
    accountStreamsSetEventsWithReceivers,
    (event) => event.erc20,
  );

  const response = {} as Record<
    SupportedChain,
    ReturnType<typeof buildAssetConfigs>
  >;

  chainsToQuery.forEach((chain) => {
    response[chain] = buildAssetConfigs(
      accountId,
      accountMetadata[chain]?.metadata,
      accountStreamsSetEventsWithReceiversByErc20,
    );
  });

  return response;
}
