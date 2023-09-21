import GitProjectModel from '../git-project/GitProjectModel';
import AddressDriverSplitReceiverModel from '../models/AddressDriverSplitReceiverModel';
import DripListModel from '../drip-list/DripListModel';
import DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';
import RepoDriverSplitReceiverModel from '../models/RepoDriverSplitReceiverModel';
import sequelizeInstance from './sequelizeInstance';

export default async function initDb() {
  await sequelizeInstance.authenticate();

  initModels();
  defineAssociations();
}

function initModels() {
  DripListModel.initialize(sequelizeInstance);
  GitProjectModel.initialize(sequelizeInstance);
  DripListSplitReceiverModel.initialize(sequelizeInstance);
  RepoDriverSplitReceiverModel.initialize(sequelizeInstance);
  AddressDriverSplitReceiverModel.initialize(sequelizeInstance);
}

function defineAssociations() {
  // ********************* Git Project *********************
  GitProjectModel.hasMany(AddressDriverSplitReceiverModel, {
    foreignKey: 'funderProjectId',
    as: 'projectAddressSplits',
  });
  AddressDriverSplitReceiverModel.belongsTo(GitProjectModel, {
    foreignKey: 'funderProjectId',
  });

  GitProjectModel.hasMany(RepoDriverSplitReceiverModel, {
    foreignKey: 'funderProjectId',
    as: 'projectRepoSplits',
  });
  RepoDriverSplitReceiverModel.belongsTo(GitProjectModel, {
    foreignKey: 'funderProjectId',
  });

  GitProjectModel.hasOne(RepoDriverSplitReceiverModel, {
    foreignKey: 'fundeeProjectId',
  });
  RepoDriverSplitReceiverModel.belongsTo(GitProjectModel, {
    foreignKey: 'fundeeProjectId',
    as: 'projectFundeeProject',
  });

  // ********************* Drip List *********************
  DripListModel.hasMany(AddressDriverSplitReceiverModel, {
    foreignKey: 'funderDripListId',
    as: 'listAddressSplits',
  });
  AddressDriverSplitReceiverModel.belongsTo(DripListModel, {
    foreignKey: 'funderDripListId',
  });

  DripListModel.hasMany(RepoDriverSplitReceiverModel, {
    foreignKey: 'funderDripListId',
    as: 'listRepoSplits',
  });
  RepoDriverSplitReceiverModel.belongsTo(DripListModel, {
    foreignKey: 'funderDripListId',
  });

  DripListModel.hasMany(DripListSplitReceiverModel, {
    foreignKey: 'funderDripListId',
    as: 'listNftSplits',
  });
  DripListSplitReceiverModel.belongsTo(DripListModel, {
    foreignKey: 'funderDripListId',
  });

  DripListModel.hasOne(RepoDriverSplitReceiverModel, {
    foreignKey: 'fundeeDripListId',
  });
  RepoDriverSplitReceiverModel.belongsTo(DripListModel, {
    foreignKey: 'fundeeDripListId',
    as: 'projectFundeeList',
  });

  DripListModel.hasOne(DripListSplitReceiverModel, {
    foreignKey: 'fundeeDripListId',
  });
  DripListSplitReceiverModel.belongsTo(DripListModel, {
    foreignKey: 'fundeeDripListId',
    as: 'listFundeeList',
  });
}
