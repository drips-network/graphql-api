import { isAddress } from 'ethers';
import type { AccountId, Address, DripListId } from '../common/types';
import type DripListModel from './DripListModel';
import type {
  AddressDriverAccount,
  AddressReceiver,
  DripList,
  DripListWhereInput,
  NftDriverAccount,
  Project,
  SplitsReceiver,
} from '../generated/graphql';
import { Driver } from '../generated/graphql';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import type { Context } from '../server';
import type GitProjectModel from '../project/ProjectModel';
import assert, { isDripListId } from '../utils/assert';
import SplitEventModel from '../models/SplitEventModel';
import mergeAmounts from '../utils/mergeAmounts';
import GivenEventModel from '../given-event/GivenEventModel';
import { getLatestMetadataHash } from '../utils/getLatestAccountMetadata';

const dripListResolvers = {
  Query: {
    dripList: async (
      _: any,
      { id }: { id: DripListId },
      { dataSources }: Context,
    ): Promise<DripListModel | null> => {
      assert(isDripListId(id));

      return dataSources.dripListsDb.getDripListById(id);
    },
    dripLists: async (
      _: any,
      { where }: { where: DripListWhereInput },
      { dataSources }: Context,
    ): Promise<DripListModel[]> => {
      if (where?.id) {
        assert(isDripListId(where.id));
      }
      if (where?.ownerAddress) {
        assert(isAddress(where.ownerAddress));
      }

      return dataSources.dripListsDb.getDripListsByFilter(where);
    },
    mintedTokensCountByOwnerAddress: async (
      _: any,
      { ownerAddress }: { ownerAddress: Address },
      { dataSources }: Context,
    ): Promise<number> => {
      assert(isAddress(ownerAddress));

      return dataSources.dripListsDb.getMintedTokensCountByAccountId(
        ownerAddress,
      );
    },
  },
  DripList: {
    name: (dripList: DripListModel) => dripList.name ?? 'Unnamed Drip List',
    creator: (dripList: DripListModel) => dripList.creator,
    description: (dripList: DripListModel) => dripList.description,
    previousOwnerAddress: (dripList: DripListModel) =>
      dripList.previousOwnerAddress,
    owner: (dripList: DripListModel): AddressDriverAccount => ({
      driver: Driver.ADDRESS,
      accountId: dripList.ownerAccountId || shouldNeverHappen(),
      address: (dripList.ownerAddress as string) || shouldNeverHappen(),
    }),
    account: (dripList: DripListModel): NftDriverAccount => ({
      driver: Driver.NFT,
      accountId: dripList.id,
    }),
    splits: async (
      dripList: DripListModel,
      _: any,
      context: Context,
    ): Promise<SplitsReceiver[]> => {
      const {
        dataSources: {
          projectsDb,
          dripListsDb,
          receiversOfTypeAddressDb,
          receiversOfTypeProjectDb,
          receiversOfTypeDripListDb,
        },
      } = context;

      const receiversOfTypeAddressModels =
        await receiversOfTypeAddressDb.getReceiversOfTypeAddressByDripListId(
          dripList.id,
        );
      const addressSplits = receiversOfTypeAddressModels.map((receiver) => ({
        driver: Driver.ADDRESS,
        weight: receiver.weight,
        receiverType: receiver.type,
        account: {
          driver: Driver.ADDRESS,
          accountId: receiver.fundeeAccountId,
          address: receiver.fundeeAccountAddress,
        },
      })) as AddressReceiver[];

      const receiversOfTypeProjectModels =
        await receiversOfTypeProjectDb.getReceiversOfTypeProjectByDripListId(
          dripList.id,
        );

      const splitsOfTypeProjectModels = await projectsDb.getProjectsByIds(
        receiversOfTypeProjectModels.map((r) => r.fundeeProjectId),
      );

      const projectReceivers = receiversOfTypeProjectModels.map((receiver) => ({
        driver: Driver.REPO,
        weight: receiver.weight,
        receiverType: receiver.type,
        account: {
          driver: Driver.REPO,
          accountId: receiver.fundeeProjectId,
        },
        project:
          (splitsOfTypeProjectModels
            .filter(
              (p): p is GitProjectModel => p && (p as any).id !== undefined,
            )
            .find(
              (p) => (p as any).id === receiver.fundeeProjectId,
            ) as unknown as Project) || shouldNeverHappen(),
      }));

      const receiversOfTypeDripListModels =
        await receiversOfTypeDripListDb.getReceiversOfTypeDripListByDripListId(
          dripList.id,
        );

      const splitsOfTypeDripListModels = await dripListsDb.getDripListsByIds(
        receiversOfTypeDripListModels.map((r) => r.fundeeDripListId),
      );

      const dripListReceivers = receiversOfTypeDripListModels.map(
        (receiver) => ({
          driver: Driver.NFT,
          weight: receiver.weight,
          account: {
            driver: Driver.NFT,
            accountId: receiver.fundeeDripListId,
          },
          dripList:
            (splitsOfTypeDripListModels
              .filter(
                (l): l is DripListModel => l && (l as any).id !== undefined,
              )
              .find(
                (p) => (p as any).id === receiver.fundeeDripListId,
              ) as unknown as DripList) || shouldNeverHappen(),
        }),
      );

      return [...addressSplits, ...projectReceivers, ...dripListReceivers];
    },
    support: async (dripList: DripListModel, _: any, context: Context) => {
      const {
        dataSources: { projectAndDripListSupportDb },
      } = context;

      const projectAndDripListSupport =
        await projectAndDripListSupportDb.getProjectAndDripListSupportByDripListId(
          dripList.id,
        );

      const oneTimeDonationSupport =
        await projectAndDripListSupportDb.getOneTimeDonationSupportByAccountId(
          dripList.id,
        );

      const streamSupport =
        await projectAndDripListSupportDb.getStreamSupportByAccountId(
          dripList.id,
        );

      return [
        ...projectAndDripListSupport,
        ...streamSupport,
        ...oneTimeDonationSupport,
      ];
    },
    latestVotingRoundId: (dripList: DripListModel) =>
      dripList.latestVotingRoundId,
    totalEarned: async (dripList: DripListModel) => {
      const [splitEvents, givenEvents] = await Promise.all([
        SplitEventModel.findAll({
          where: {
            receiver: dripList.id,
          },
        }),
        GivenEventModel.findAll({
          where: {
            receiver: dripList.id,
          },
        }),
      ]);

      return mergeAmounts(
        [...splitEvents, ...givenEvents].map((event) => ({
          tokenAddress: event.erc20,
          amount: BigInt(event.amt),
        })),
      ).map((amount) => ({
        ...amount,
        amount: amount.amount.toString(),
      }));
    },
    latestMetadataIpfsHash: async (parent: DripListModel) => {
      const { id } = parent;
      return getLatestMetadataHash(id as AccountId);
    },
  },
};

export default dripListResolvers;
