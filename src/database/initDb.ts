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
  // One-to-Many: A project can fund multiple address splits.
  GitProjectModel.hasMany(AddressDriverSplitReceiverModel, {
    foreignKey: 'funderProjectId',
    as: 'projectAddressSplits',
  });
  AddressDriverSplitReceiverModel.belongsTo(GitProjectModel, {
    foreignKey: 'funderProjectId',
  });

  // One-to-Many: A project can fund multiple project splits.
  GitProjectModel.hasMany(RepoDriverSplitReceiverModel, {
    foreignKey: 'funderProjectId',
    as: 'projectRepoSplits',
  });
  RepoDriverSplitReceiverModel.belongsTo(GitProjectModel, {
    foreignKey: 'funderProjectId',
  });

  // One-to-Many: A project can fund multiple drip list splits.
  GitProjectModel.hasMany(DripListSplitReceiverModel, {
    foreignKey: 'funderProjectId',
  });
  DripListSplitReceiverModel.belongsTo(GitProjectModel, {
    foreignKey: 'funderProjectId',
  });

  // One-to-One: A RepoDriverSplitReceiver represents/is a project.
  GitProjectModel.hasOne(RepoDriverSplitReceiverModel, {
    foreignKey: 'fundeeProjectId',
  });
  RepoDriverSplitReceiverModel.belongsTo(GitProjectModel, {
    foreignKey: 'fundeeProjectId',
    as: 'projectFundeeProject',
  });
  RepoDriverSplitReceiverModel.belongsTo(GitProjectModel, {
    foreignKey: 'fundeeProjectId',
    as: 'listFundeeProject',
  });

  // One-to-Many: A drip list can fund multiple address splits.
  DripListModel.hasMany(AddressDriverSplitReceiverModel, {
    foreignKey: 'funderDripListId',
    as: 'listAddressSplits',
  });
  AddressDriverSplitReceiverModel.belongsTo(DripListModel, {
    foreignKey: 'funderDripListId',
  });

  // One-to-Many: A drip list can fund multiple project splits.
  DripListModel.hasMany(RepoDriverSplitReceiverModel, {
    foreignKey: 'funderDripListId',
    as: 'listRepoSplits',
  });
  RepoDriverSplitReceiverModel.belongsTo(DripListModel, {
    foreignKey: 'funderDripListId',
  });

  // One-to-Many: A drip list can fund multiple drip list splits.
  DripListModel.hasMany(DripListSplitReceiverModel, {
    foreignKey: 'funderDripListId',
    as: 'listNftSplits',
  });
  DripListSplitReceiverModel.belongsTo(DripListModel, {
    foreignKey: 'funderDripListId',
  });

  // One-to-One: A DripListSplitReceiverModel represents/is a drip list.
  DripListModel.hasOne(DripListSplitReceiverModel, {
    foreignKey: 'fundeeDripListId',
  });
  DripListSplitReceiverModel.belongsTo(DripListModel, {
    foreignKey: 'fundeeDripListId',
    as: 'projectFundeeList',
  });
  DripListSplitReceiverModel.belongsTo(DripListModel, {
    foreignKey: 'fundeeDripListId',
    as: 'listFundeeList',
  });
}
