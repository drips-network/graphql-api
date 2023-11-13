import { Sequelize } from 'sequelize';
import ProjectModel from '../project/ProjectModel';
import AddressDriverSplitReceiverModel from '../models/AddressDriverSplitReceiverModel';
import DripListModel from '../drip-list/DripListModel';
import DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';
import RepoDriverSplitReceiverModel from '../models/RepoDriverSplitReceiverModel';
import config from '../common/config';
import GivenEventModel from '../given-event/GivenEventModel';

export default async function connectToDatabase() {
  const dbConnection = new Sequelize(`${config.postgresConnectionString}`, {});

  await dbConnection.authenticate();

  ProjectModel.initialize(dbConnection);
  DripListModel.initialize(dbConnection);
  DripListSplitReceiverModel.initialize(dbConnection);
  RepoDriverSplitReceiverModel.initialize(dbConnection);
  AddressDriverSplitReceiverModel.initialize(dbConnection);
  GivenEventModel.initialize(dbConnection);
}
