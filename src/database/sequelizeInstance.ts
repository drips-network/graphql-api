import { Sequelize } from 'sequelize';
import config from '../common/config';

const { postgresConnectionString } = config;

const sequelizeInstance = new Sequelize(`${postgresConnectionString}`, {});

export default sequelizeInstance;
