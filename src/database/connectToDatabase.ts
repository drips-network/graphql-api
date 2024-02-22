import { Sequelize } from 'sequelize';
import ProjectModel from '../project/ProjectModel';
import AddressDriverSplitReceiverModel from '../models/AddressDriverSplitReceiverModel';
import DripListModel from '../drip-list/DripListModel';
import DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';
import RepoDriverSplitReceiverModel from '../models/RepoDriverSplitReceiverModel';
import GivenEventModel from '../given-event/GivenEventModel';
import appSettings from '../common/appSettings';
import TransferEventModel from '../drip-list/TransferEventModel';
import SplitEventModel from '../models/SplitEventModel';

export default async function connectToDatabase() {
  const dbConnection = new Sequelize(
    `${appSettings.postgresConnectionString}`,
    {},
  );

  await dbConnection.authenticate();

  ProjectModel.initialize(dbConnection);
  DripListModel.initialize(dbConnection);
  SplitEventModel.initialize(dbConnection);
  GivenEventModel.initialize(dbConnection);
  TransferEventModel.initialize(dbConnection);
  DripListSplitReceiverModel.initialize(dbConnection);
  RepoDriverSplitReceiverModel.initialize(dbConnection);
  AddressDriverSplitReceiverModel.initialize(dbConnection);
}
