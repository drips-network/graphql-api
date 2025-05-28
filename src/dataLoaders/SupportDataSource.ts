import DataLoader from 'dataloader';
import type { AccountId, DbSchema, MultiChainKey } from '../common/types';
import type { GivenEventModelDataValues } from '../given-event/GivenEventModel';
import streams from '../utils/streams';
import type { ProtoStream } from '../utils/buildAssetConfigs';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import givenEventsQueries from './sqlQueries/givenEventsQueries';
import { getSplitsReceivers } from './sqlQueries/splitsReceiversQueries';
import type { SplitsReceiverModelDataValues } from '../models/SplitsReceiverModel';

export default class SupportDataSource {
  private readonly _batchSplitSupportByReceiverIds = new DataLoader(
    async (keys: readonly MultiChainKey[]) => {
      const { chains, ids: receiverAccountIds } = parseMultiChainKeys(keys);

      const splitsReceivers = await getSplitsReceivers(
        chains,
        receiverAccountIds,
      );

      const projectAndDripListSupportToDripListMapping = splitsReceivers.reduce<
        Record<AccountId, SplitsReceiverModelDataValues[]>
      >((mapping, receiver) => {
        if (!mapping[receiver.receiverAccountId]) {
          mapping[receiver.receiverAccountId] = []; // eslint-disable-line no-param-reassign
        }

        mapping[receiver.receiverAccountId].push(receiver);

        return mapping;
      }, {});

      return receiverAccountIds.map(
        (id) => projectAndDripListSupportToDripListMapping[id] || [],
      );
    },
  );

  private readonly _batchStreamSupportByAccountIds = new DataLoader(
    async (accountKeys: readonly MultiChainKey[]) => {
      const { chains, ids: accountIds } = parseMultiChainKeys(accountKeys);

      const streamsToList = (
        await Promise.all(
          accountIds.map((accountId) =>
            streams.getUserIncomingStreams(chains, accountId),
          ),
        )
      )
        .flatMap((s) =>
          Object.entries(s).map(([chain, protoStreamsForChain]) =>
            protoStreamsForChain.map((protoStream) => ({
              ...protoStream,
              chain: chain as DbSchema,
            })),
          ),
        )
        .flat();

      const streamSupportToAccountMapping = streamsToList.reduce<
        Record<AccountId, ProtoStream[]>
      >(
        (mapping, stream) => ({
          ...mapping,
          [stream.receiver.accountId as AccountId]: [
            ...(mapping[stream.receiver.accountId as AccountId] || []),
            stream,
          ],
        }),
        {},
      ) as Record<AccountId, (ProtoStream & { chain: DbSchema })[]>;

      return accountIds.map((id) => streamSupportToAccountMapping[id] || []);
    },
  );

  private readonly _batchOneTimeDonationSupportByAccountIds = new DataLoader(
    async (keys: readonly MultiChainKey[]) => {
      const { chains, ids } = parseMultiChainKeys(keys);

      const oneTimeDonationSupport = await givenEventsQueries.getByReceivers(
        chains,
        ids,
      );

      const oneTimeDonationSupportToDripListMapping =
        oneTimeDonationSupport.reduce<
          Record<AccountId, GivenEventModelDataValues[]>
        >((mapping, givenEvent) => {
          if (!mapping[givenEvent.receiver]) {
            mapping[givenEvent.receiver] = []; // eslint-disable-line no-param-reassign
          }

          mapping[givenEvent.receiver].push(givenEvent);

          return mapping;
        }, {});

      return ids.map((id) => oneTimeDonationSupportToDripListMapping[id] || []);
    },
  );

  public async getSplitSupportByReceiverIdOnChain(
    accountId: AccountId,
    chain: DbSchema,
  ): Promise<SplitsReceiverModelDataValues[]> {
    return (
      await this._batchSplitSupportByReceiverIds.load({
        accountId,
        chains: [chain],
      })
    ).filter((receiver) => receiver.chain === chain);
  }

  public async getOneTimeDonationSupportByAccountIdOnChain(
    accountId: AccountId,
    chain: DbSchema,
  ): Promise<GivenEventModelDataValues[]> {
    return (
      await this._batchOneTimeDonationSupportByAccountIds.load({
        accountId,
        chains: [chain],
      })
    ).filter((support) => support.chain === chain);
  }

  public async getStreamSupportByAccountIdOnChain(
    accountId: AccountId,
    chain: DbSchema,
  ) {
    return (
      await this._batchStreamSupportByAccountIds.load({
        accountId,
        chains: [chain],
      })
    ).filter((s) => s.chain === chain);
  }
}
