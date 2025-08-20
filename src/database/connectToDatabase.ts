import { Sequelize } from 'sequelize';
import ProjectModel from '../project/ProjectModel';
import DripListModel from '../drip-list/DripListModel';
import GivenEventModel from '../given-event/GivenEventModel';
import appSettings from '../common/appSettings';
import TransferEventModel from '../drip-list/TransferEventModel';
import SplitEventModel from '../models/SplitEventModel';
import StreamsSetEventModel from '../models/StreamsSetEventModel';
import StreamReceiverSeenEventModel from '../models/StreamReceiverSeenEventModel';
import AccountMetadataEmittedEventModel from '../models/AccountMetadataEmittedEventModel';
import SqueezedStreamsEventModel from '../models/SqueezedStreamsEventModel';
import EcosystemMainAccountModel from '../ecosystem/EcosystemMainAccountModel';
import SubListModel from '../sub-list/SubListModel';
import SplitsReceiverModel from '../models/SplitsReceiverModel';
import LinkedIdentityModel from '../linked-identity/LinkedIdentityModel';

export const dbConnection = new Sequelize(
  `${appSettings.postgresConnectionString}`,
  { logging: false },
);

export async function connectToDatabase() {
  await dbConnection.authenticate();

  SubListModel.initialize(dbConnection);
  ProjectModel.initialize(dbConnection);
  DripListModel.initialize(dbConnection);
  GivenEventModel.initialize(dbConnection);
  SplitEventModel.initialize(dbConnection);
  TransferEventModel.initialize(dbConnection);
  LinkedIdentityModel.initialize(dbConnection);
  SplitsReceiverModel.initialize(dbConnection);
  StreamsSetEventModel.initialize(dbConnection);
  SqueezedStreamsEventModel.initialize(dbConnection);
  EcosystemMainAccountModel.initialize(dbConnection);
  StreamReceiverSeenEventModel.initialize(dbConnection);
  AccountMetadataEmittedEventModel.initialize(dbConnection);
}
