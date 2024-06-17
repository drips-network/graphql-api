import type { AddressDriverId } from '../common/types';
import streamsSetEventsQueries from '../dataLoaders/sqlQueries/streamsSetEventsQueries';
import type { SupportedChain } from '../generated/graphql';
import buildAssetConfigs from './buildAssetConfigs';
import type getLatestAccountMetadataByChain from './getLatestAccountMetadata';
import groupBy from './linq';

export default async function getAssetConfigs(
  accountId: AddressDriverId,
  accountMetadata: NonNullable<
    Awaited<ReturnType<typeof getLatestAccountMetadataByChain>>
  >,
  chains: SupportedChain[],
): Promise<Record<SupportedChain, ReturnType<typeof buildAssetConfigs>>> {
  const accountStreamsSetEventsWithReceivers =
    await streamsSetEventsQueries.getStreamsSetEventsWithReceivers(
      chains,
      accountId,
    );

  const accountStreamsSetEventsWithReceiversByErc20 = groupBy(
    accountStreamsSetEventsWithReceivers,
    (event) => event.erc20,
  );

  const response = {} as Record<
    SupportedChain,
    ReturnType<typeof buildAssetConfigs>
  >;

  chains.forEach((chain) => {
    response[chain] = buildAssetConfigs(
      accountId,
      accountMetadata[chain]?.metadata,
      accountStreamsSetEventsWithReceiversByErc20,
      chain,
    );
  });

  return response;
}
