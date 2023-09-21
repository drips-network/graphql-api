import type { DripListId } from '../common/types';
import GitProjectModel from '../git-project/GitProjectModel';
import AddressDriverSplitReceiverModel from '../models/AddressDriverSplitReceiverModel';
import DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';
import RepoDriverSplitReceiverModel from '../models/RepoDriverSplitReceiverModel';
import DripListModel from './DripListModel';

const dripListResolvers = {
  Query: {
    async dripList(_: any, args: { id: DripListId }) {
      const project = await DripListModel.findByPk(args.id, {
        include: [
          {
            model: AddressDriverSplitReceiverModel,
            as: 'listAddressSplits',
          },
          {
            model: RepoDriverSplitReceiverModel,
            as: 'listRepoSplits',
            include: [
              {
                model: GitProjectModel,
                as: 'listFundeeProject',
              },
            ],
          },
          {
            model: DripListSplitReceiverModel,
            as: 'listNftSplits',
            include: [
              {
                model: DripListModel,
                as: 'listFundeeList',
              },
            ],
          },
        ],
      });

      if (!project) {
        return null;
      }

      return toDto(project);
    },
    async dripLists() {
      const projects = await DripListModel.findAll({
        include: [
          {
            model: AddressDriverSplitReceiverModel,
            as: 'listAddressSplits',
          },
          {
            model: RepoDriverSplitReceiverModel,
            as: 'listRepoSplits',
          },
          {
            model: DripListSplitReceiverModel,
            as: 'listNftSplits',
          },
        ],
      });

      return projects.map(toDto);
    },
  },
};

export default dripListResolvers;

enum Driver {
  AddressDriver = 'AddressDriver',
  RepoDriver = 'RepoDriver',
  NftDriver = 'NftDriver',
}

function toDto(dripList: DripListModel) {
  const dependenciesOfTypeAddress = dripList.listAddressSplits?.map((a) => ({
    ...a.dataValues,
    driver: Driver.AddressDriver,
  }));

  const dependenciesOfTypeProject = dripList.listRepoSplits?.map((p) => ({
    ...p.dataValues,
    fundeeProject: p.listFundeeProject?.dataValues
      ? {
          ...p.listFundeeProject?.dataValues,
        }
      : null,
    driver: Driver.RepoDriver,
  }));

  const dependenciesOfTypeDripList = dripList.listNftSplits?.map((n) => ({
    ...n.dataValues,
    fundeeDripList: n.listFundeeList?.dataValues
      ? {
          ...n.listFundeeList?.dataValues,
        }
      : null,
    driver: Driver.NftDriver,
    type: 'DripListDependency',
  }));

  return {
    ...dripList?.dataValues,
    splits: {
      ofTypeAddress: dependenciesOfTypeAddress,
      ofTypeProject: dependenciesOfTypeProject,
      ofTypeDripList: dependenciesOfTypeDripList,
    },
  };
}
