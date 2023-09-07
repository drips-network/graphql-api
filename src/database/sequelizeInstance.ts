import { Sequelize } from 'sequelize';
import config from './config';

const {
  postgresHost,
  postgresPort,
  postgresDatabase,
  postgresPassword,
  postgresUsername,
} = config;

const sequelizeInstance = new Sequelize(
  `postgres://${postgresUsername}:${postgresPassword}@${postgresHost}:${postgresPort}/${postgresDatabase}`,
);

export default sequelizeInstance;
