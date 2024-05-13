import type { AddressDriverId } from '../common/types';
import type { AssetConfig } from '../generated/graphql';
import buildAssetConfigs from './buildAssetConfigs';
import type getLatestAccountMetadata from './getLatestAccountMetadata';
import getStreamsSetEventsWithReceivers from './getStreamsSetEventsWithReceivers';
import groupBy from './linq';

export default async function getAssetConfigs(
  accountId: AddressDriverId,
  accountMetadata:
    | NonNullable<
        Awaited<ReturnType<typeof getLatestAccountMetadata>>
      >['metadata']
    | undefined,
): Promise<AssetConfig[]> {
  const accountStreamsSetEventsWithReceivers =
    await getStreamsSetEventsWithReceivers(accountId);

  const accountStreamsSetEventsWithReceiversByErc20 = groupBy(
    accountStreamsSetEventsWithReceivers,
    (event) => event.erc20,
  );

  return buildAssetConfigs(
    accountId,
    accountMetadata,
    accountStreamsSetEventsWithReceiversByErc20,
  );
}
