import type { DripListId } from '../common/types';
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
import type { ContextValue } from '../server';
import type GitProjectModel from '../project/ProjectModel';

const dripListResolvers = {
  Query: {
    dripList: async (
      _: any,
      { id }: { id: DripListId },
      { dataSources }: ContextValue,
    ): Promise<DripListModel | null> =>
      dataSources.dripListsDb.getDripListById(id),
    dripLists: async (
      _: any,
      { where }: { where: DripListWhereInput },
      { dataSources }: ContextValue,
    ): Promise<DripListModel[]> =>
      dataSources.dripListsDb.getDripListsByFilter(where),
  },
  DripList: {
    name: (dripList: DripListModel) => dripList.name,
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
      context: ContextValue,
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
  },
};

export default dripListResolvers;
