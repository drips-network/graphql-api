import DataLoader from 'dataloader';
import type { DbSchema, AccountId, MultiChainKey } from '../common/types';
import parseMultiChainKeys from '../utils/parseMultiChainKeys';
import {
  getSplitsReceivers,
  getSplitsReceiversForSenderIds,
} from './sqlQueries/splitsReceiversQueries';
import type { SplitsReceiverModelDataValues } from '../models/SplitsReceiverModel';

type ReceiverFetcher = (
  chains: DbSchema[],
  accountIds: AccountId[],
) => Promise<SplitsReceiverModelDataValues[]>;

export default class SplitsReceiversDataSource {
  private readonly _batchSplitsReceiversIds =
    this.createBatchLoader(getSplitsReceivers);

  private readonly _batchSplitsReceiversForSenderIds = this.createBatchLoader(
    getSplitsReceiversForSenderIds,
  );

  public async getSplitsReceiversOnChain(
    accountId: AccountId,
    chain: DbSchema,
  ): Promise<SplitsReceiverModelDataValues[]> {
    const receivers = await this._batchSplitsReceiversIds.load({
      accountId,
      chains: [chain],
    });

    return receivers.filter((receiver) => receiver.chain === chain);
  }

  public async getSplitsReceiversForSenderOnChain(
    accountId: AccountId,
    chain: DbSchema,
  ): Promise<SplitsReceiverModelDataValues[]> {
    const receivers = await this._batchSplitsReceiversForSenderIds.load({
      accountId,
      chains: [chain],
    });

    return receivers.filter((receiver) => receiver.chain === chain);
  }

  private createBatchLoader(
    fetchFn: ReceiverFetcher,
  ): DataLoader<MultiChainKey, SplitsReceiverModelDataValues[]> {
    return new DataLoader(async (projectKeys: readonly MultiChainKey[]) => {
      const { chains, ids: accountIds } = parseMultiChainKeys(projectKeys);
      const splitsReceivers = await fetchFn(chains, accountIds);

      const receiverMap = splitsReceivers.reduce<
        Record<AccountId, SplitsReceiverModelDataValues[]>
      >((acc, receiver) => {
        const key = receiver.senderAccountId;
        acc[key] = acc[key] || [];
        acc[key].push(receiver);
        return acc;
      }, {});

      return accountIds.map((id) => receiverMap[id] || []);
    });
  }
}
