import { QueryTypes } from 'sequelize';
import type { StreamReceiverSeenEventModelDataValues } from '../models/StreamReceiverSeenEventModel';
import StreamReceiverSeenEventModel from '../models/StreamReceiverSeenEventModel';
import type { StreamsSetEventModelDataValues } from '../models/StreamsSetEventModel';
import StreamsSetEventModel from '../models/StreamsSetEventModel';
import assert, { isAddressDriverId } from './assert';
import getUserAccount from './getUserAccount';
import type {
  AddressDriverAccount,
  NftDriverAccount,
  SupportedChain,
} from '../generated/graphql';

import type { AccountId } from '../common/types';
import type { ProtoStream } from './buildAssetConfigs';
import { dbConnection } from '../database/connectToDatabase';

async function getUserIncomingStreams(
  chains: SupportedChain[],
  accountId: AccountId,
) {
  const baseStreamReceiverSeenEventsSQL = (schema: SupportedChain) =>
    `SELECT *, '${schema}' AS chain FROM "${schema}"."StreamReceiverSeenEvents" WHERE "accountId" = :accountId`;

  const streamReceiverSeenEventsSqlQueries = `${chains
    .map((chain) => `${baseStreamReceiverSeenEventsSQL(chain)}`)
    .join(' UNION ')} LIMIT 1000`;

  const streamReceiverSeenEventModelDataValuesForUser = (
    await dbConnection.query(streamReceiverSeenEventsSqlQueries, {
      type: QueryTypes.SELECT,
      replacements: { accountId },
      mapToModel: true,
      model: StreamReceiverSeenEventModel,
    })
  ).map((p) => p.dataValues as StreamReceiverSeenEventModelDataValues);

  const baseStreamsSetEventsSQL = (schema: SupportedChain) =>
    `SELECT *, '${schema}' AS chain FROM "${schema}"."StreamsSetEvents"`;

  const whereClause = streamReceiverSeenEventModelDataValuesForUser.length
    ? ` WHERE "receiversHash" IN (:receiversHash)`
    : '';

  const streamsSetEventsSqlQueries = chains.map(
    (chain) => baseStreamsSetEventsSQL(chain) + whereClause,
  );

  const fullStreamsSetEventsQuery = `${streamsSetEventsSqlQueries.join(
    ' UNION ',
  )} LIMIT 1000`;

  const streamsSetEventsWithMatchingHistoryHash = (
    await dbConnection.query(fullStreamsSetEventsQuery, {
      type: QueryTypes.SELECT,
      replacements: {
        receiversHash: streamReceiverSeenEventModelDataValuesForUser.map(
          (event) => event.receiversHash,
        ),
      },
      mapToModel: true,
      model: StreamsSetEventModel,
    })
  ).map((p) => p.dataValues as StreamsSetEventModelDataValues);

  const accountIdsStreamingToUser = streamsSetEventsWithMatchingHistoryHash
    .map((event) => event.accountId)
    .filter((id, index, self) => self.indexOf(id) === index);

  const accountsStreamingToUser = await Promise.all(
    accountIdsStreamingToUser.map((id) => {
      assert(isAddressDriverId(id));
      return getUserAccount(chains, id);
    }),
  );

  const response = {} as Record<SupportedChain, ProtoStream[]>;

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
