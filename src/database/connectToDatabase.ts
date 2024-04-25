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
import StreamsSetEventModel from '../models/StreamsSetEventModel';
import StreamReceiverSeenEventModel from '../models/StreamReceiverSeenEventModel';
import AccountMetadataEmittedEventModel from '../models/AccountMetadataEmittedEventModel';
import SqueezedStreamsEventModel from '../models/SqueezedStreamsEventModel';

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
  StreamsSetEventModel.initialize(dbConnection);
  SqueezedStreamsEventModel.initialize(dbConnection);
  DripListSplitReceiverModel.initialize(dbConnection);
  StreamReceiverSeenEventModel.initialize(dbConnection);
  RepoDriverSplitReceiverModel.initialize(dbConnection);
  AddressDriverSplitReceiverModel.initialize(dbConnection);
  AccountMetadataEmittedEventModel.initialize(dbConnection);
}
