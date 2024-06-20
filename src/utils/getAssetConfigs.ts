import type { AddressDriverId, DbSchema } from '../common/types';
import streamsSetEventsQueries from '../dataLoaders/sqlQueries/streamsSetEventsQueries';
import buildAssetConfigs from './buildAssetConfigs';
import type getLatestAccountMetadataOnChain from './getLatestAccountMetadata';
import groupBy from './linq';

export default async function getAssetConfigs(
  accountId: AddressDriverId,
  accountMetadata: NonNullable<
    Awaited<ReturnType<typeof getLatestAccountMetadataOnChain>>
  >,
  chains: DbSchema[],
): Promise<Record<DbSchema, ReturnType<typeof buildAssetConfigs>>> {
  const accountStreamsSetEventsWithReceivers =
    await streamsSetEventsQueries.getStreamsSetEventsWithReceivers(
      chains,
      accountId,
    );

  const accountStreamsSetEventsWithReceiversByErc20 = groupBy(
    accountStreamsSetEventsWithReceivers,
    (event) => event.erc20,
  );

  const response = {} as Record<DbSchema, ReturnType<typeof buildAssetConfigs>>;

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
