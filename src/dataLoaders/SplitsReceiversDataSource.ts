import DataLoader from 'dataloader';
import type { DbSchema, AccountId, MultiChainKey } from '../common/types';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import {
  getSplitsReceivers,
  getSplitsReceiversForSenderIds,
} from './sqlQueries/splitsReceiversQueries';
import type { SplitsReceiverModelDataValues } from '../models/SplitsReceiverModel';

export default class SplitsReceiversDataSource {
  private readonly _batchSplitsReceiversIds = new DataLoader(
    async (projectKeys: readonly MultiChainKey[]) => {
      const { chains, ids: receiverAccountIds } =
        parseMultiChainKeys(projectKeys);

      const splitsReceivers = await getSplitsReceivers(
        chains,
        receiverAccountIds,
      );

      const splitsReceiversToAccountMapping = splitsReceivers.reduce<
        Record<AccountId, SplitsReceiverModelDataValues[]>
      >((mapping, receiver) => {
        if (!mapping[receiver.senderAccountId]) {
          mapping[receiver.senderAccountId] = []; // eslint-disable-line no-param-reassign
        }

        mapping[receiver.senderAccountId].push(receiver);

        return mapping;
      }, {});

      return receiverAccountIds.map(
        (id) => splitsReceiversToAccountMapping[id] || [],
      );
    },
  );

  public async getSplitsReceiversOnChain(
    accountId: AccountId,
    chain: DbSchema,
  ): Promise<SplitsReceiverModelDataValues[]> {
    return (
      await this._batchSplitsReceiversIds.load({
        accountId,
        chains: [chain],
      })
    ).filter((receiver) => receiver.chain === chain);
  }

  private readonly _batchSplitsReceiversForSenderIds = new DataLoader(
    async (projectKeys: readonly MultiChainKey[]) => {
      const { chains, ids: senderAccountIds } =
        parseMultiChainKeys(projectKeys);

      const splitsReceivers = await getSplitsReceiversForSenderIds(
        chains,
        senderAccountIds,
      );

      const splitsReceiversToAccountMapping = splitsReceivers.reduce<
        Record<AccountId, SplitsReceiverModelDataValues[]>
      >((mapping, receiver) => {
        if (!mapping[receiver.senderAccountId]) {
          mapping[receiver.senderAccountId] = []; // eslint-disable-line no-param-reassign
        }

        mapping[receiver.senderAccountId].push(receiver);

        return mapping;
      }, {});

      return senderAccountIds.map(
        (id) => splitsReceiversToAccountMapping[id] || [],
      );
    },
  );

  public async getSplitsReceiversForSenderOnChain(
    accountId: AccountId,
    chain: DbSchema,
  ): Promise<SplitsReceiverModelDataValues[]> {
    return (
      await this._batchSplitsReceiversForSenderIds.load({
        accountId,
        chains: [chain],
      })
    ).filter((receiver) => receiver.chain === chain);
  }
}
