import {
  AddressDriverSplitReceiverModel,
  GitProjectModel,
  RepoDriverSplitReceiverModel,
} from '../models';
import sequelizeInstance from './sequelizeInstance';

export default async function initDb() {
  await sequelizeInstance.authenticate();

  GitProjectModel.initialize(sequelizeInstance);
  AddressDriverSplitReceiverModel.initialize(sequelizeInstance);
  RepoDriverSplitReceiverModel.initialize(sequelizeInstance);

  GitProjectModel.hasMany(AddressDriverSplitReceiverModel, {
    foreignKey: 'funderProjectId',
    as: 'addressDriverSplitReceivers',
  });
  AddressDriverSplitReceiverModel.belongsTo(GitProjectModel, {
    foreignKey: 'funderProjectId',
  });

  GitProjectModel.hasMany(RepoDriverSplitReceiverModel, {
    foreignKey: 'funderProjectId',
  });
  RepoDriverSplitReceiverModel.belongsTo(GitProjectModel, {
    foreignKey: 'funderProjectId',
  });
  GitProjectModel.hasMany(RepoDriverSplitReceiverModel, {
    foreignKey: 'selfProjectId',
  });
  RepoDriverSplitReceiverModel.belongsTo(GitProjectModel, {
    foreignKey: 'selfProjectId',
  });
}
