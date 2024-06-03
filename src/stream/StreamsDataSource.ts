import type { AddressDriverId } from '../common/types';
import type { StreamWhereInput, SupportedChain } from '../generated/graphql';
import assert, { isAddressDriverId } from '../utils/assert';
import type { ProtoStream } from '../utils/buildAssetConfigs';
import getUserAccount from '../utils/getUserAccount';
import streamsUtils from '../utils/streams';

export default class StreamsDataSource {
  public async getUserOutgoingStreams(
    chains: SupportedChain[],
    accountId: AddressDriverId,
  ) {
    const userAccount = await getUserAccount(chains, accountId);

    const response = {} as Record<SupportedChain, ProtoStream[]>;

    chains.forEach((chain) => {
      response[chain] = userAccount[chain].assetConfigs.flatMap(
        (assetConfig) => assetConfig.streams,
      );
    });

    return response;
  }

  public async getUserIncomingStreams(
    chains: SupportedChain[],
    accountId: AddressDriverId,
  ) {
    return streamsUtils.getUserIncomingStreams(chains, accountId);
  }

  public async getStreamsByFilter(
    chains: SupportedChain[],
    where: StreamWhereInput,
  ) {
    const streams = {} as Record<SupportedChain, ProtoStream[]>;

    if (!where.senderId && !where.receiverId) {
      throw new Error(
        'At least one of senderId or receiverId must be provided.',
      );
    }

    if (where.senderId) {
      assert(isAddressDriverId(where.senderId));

      const senderOutgoingStreams = await this.getUserOutgoingStreams(
        chains,
        where.senderId,
      );

      Object.entries(senderOutgoingStreams).forEach(([chain, chainStreams]) => {
        streams[chain as SupportedChain].push(...chainStreams);
      });
    }

    if (where.receiverId) {
      assert(isAddressDriverId(where.receiverId));

      const receiverIncomingStreams = await this.getUserIncomingStreams(
        chains,
        where.receiverId,
      );

      Object.entries(receiverIncomingStreams).forEach(
        ([chain, chainStreams]) => {
          streams[chain as SupportedChain].push(...chainStreams);
        },
      );
    }

    return streams;
  }
}
