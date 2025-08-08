import type { ResolverSubListData } from '../common/types';
import type { ImmutableSplitsDriverAccount } from '../generated/graphql';
import { getLatestMetadataHashOnChain } from '../utils/getLatestAccountMetadata';

const subListResolvers = {
  SubList: {
    account: (subList: ResolverSubListData): ImmutableSplitsDriverAccount =>
      subList.account,
    lastProcessedIpfsHash: (subListData: ResolverSubListData) =>
      subListData.lastProcessedIpfsHash,
    latestMetadataIpfsHash: async ({
      parentDripListInfo: { subListChain, subListId },
    }: ResolverSubListData) =>
      getLatestMetadataHashOnChain(subListId, subListChain),
    parentAccountId: (subList: ResolverSubListData) => subList.parentAccountId,
    parentAccountType: (subList: ResolverSubListData) =>
      subList.parentAccountType,
    rootAccountId: (subList: ResolverSubListData) => subList.rootAccountId,
    rootAccountType: (subList: ResolverSubListData) => subList.rootAccountType,
  },
};

export default subListResolvers;
