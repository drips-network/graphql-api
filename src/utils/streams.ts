import assert, { isAddressDriverId } from './assert';
import getUserAccount from './getUserAccount';
import type {
  AddressDriverAccount,
  NftDriverAccount,
} from '../generated/graphql';

import type { AccountId, DbSchema } from '../common/types';
import type { ProtoStream } from './buildAssetConfigs';
import streamReceiverSeenEventQueries from '../dataLoaders/sqlQueries/streamReceiverSeenEventQueries';
import streamsSetEventsQueries from '../dataLoaders/sqlQueries/streamsSetEventsQueries';

async function getUserIncomingStreams(
  chains: DbSchema[],
  accountId: AccountId,
) {
  const streamReceiverSeenEventModelDataValuesForUser =
    await streamReceiverSeenEventQueries.getByAccountId(chains, accountId);

  const receiversHashes = streamReceiverSeenEventModelDataValuesForUser.map(
    (event) => event.receiversHash,
  );

  const streamsSetEventsWithMatchingHistoryHash =
    await streamsSetEventsQueries.getByReceiversHashes(chains, receiversHashes);

  const accountIdsStreamingToUser = streamsSetEventsWithMatchingHistoryHash
    .map((event) => event.accountId)
    .filter((id, index, self) => self.indexOf(id) === index);

  const accountsStreamingToUser = await Promise.all(
    accountIdsStreamingToUser.map((id) => {
      assert(isAddressDriverId(id));
      return getUserAccount(chains, id);
    }),
  );

  const response = {} as Record<DbSchema, ProtoStream[]>;

  chains.forEach((chain) => {
    response[chain] = accountsStreamingToUser.reduce<ProtoStream[]>(
      (acc, account) => {
        const streams =
          account[chain]?.assetConfigs
            .flatMap((assetConfig) => assetConfig?.streams)
            .filter(
              (stream) =>
                (
                  stream.receiver as any as
                    | AddressDriverAccount
                    | NftDriverAccount
                ).accountId === accountId,
            ) || [];

        return [...acc, ...streams];
      },
      [],
    );
  });

  return response;
}

export default {
  getUserIncomingStreams,
};
