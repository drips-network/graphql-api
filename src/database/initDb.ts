import ProjectModel from '../project/ProjectModel';
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
  ProjectModel.initialize(sequelizeInstance);
  DripListSplitReceiverModel.initialize(sequelizeInstance);
  RepoDriverSplitReceiverModel.initialize(sequelizeInstance);
  AddressDriverSplitReceiverModel.initialize(sequelizeInstance);
}

function defineAssociations() {
  // One-to-Many: A project can fund multiple address splits.
  ProjectModel.hasMany(AddressDriverSplitReceiverModel, {
    foreignKey: 'funderProjectId',
  });
  AddressDriverSplitReceiverModel.belongsTo(ProjectModel, {
    foreignKey: 'funderProjectId',
  });

  // One-to-Many: A project can fund multiple project splits.
  ProjectModel.hasMany(RepoDriverSplitReceiverModel, {
    foreignKey: 'funderProjectId',
  });
  RepoDriverSplitReceiverModel.belongsTo(ProjectModel, {
    foreignKey: 'funderProjectId',
  });

  // One-to-Many: A project can fund multiple drip list splits.
  ProjectModel.hasMany(DripListSplitReceiverModel, {
    foreignKey: 'funderProjectId',
  });
  DripListSplitReceiverModel.belongsTo(ProjectModel, {
    foreignKey: 'funderProjectId',
  });

  // One-to-One: A RepoDriverSplitReceiver represents/is a project.
  ProjectModel.hasOne(RepoDriverSplitReceiverModel, {
    foreignKey: 'fundeeProjectId',
  });
  RepoDriverSplitReceiverModel.belongsTo(ProjectModel, {
    foreignKey: 'fundeeProjectId',
  });

  // One-to-Many: A drip list can fund multiple address splits.
  DripListModel.hasMany(AddressDriverSplitReceiverModel, {
    foreignKey: 'funderDripListId',
  });
  AddressDriverSplitReceiverModel.belongsTo(DripListModel, {
    foreignKey: 'funderDripListId',
  });

  // One-to-Many: A drip list can fund multiple project splits.
  DripListModel.hasMany(RepoDriverSplitReceiverModel, {
    foreignKey: 'funderDripListId',
  });
  RepoDriverSplitReceiverModel.belongsTo(DripListModel, {
    foreignKey: 'funderDripListId',
  });

  // One-to-Many: A drip list can fund multiple drip list splits.
  DripListModel.hasMany(DripListSplitReceiverModel, {
    foreignKey: 'funderDripListId',
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
  });
}
