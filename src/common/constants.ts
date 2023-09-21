import { DataTypes } from 'sequelize';

export const SUPPORTED_NETWORKS = ['mainnet', 'sepolia', 'goerli'] as const;

export const COMMON_EVENT_INIT_ATTRIBUTES = {
  transactionHash: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  logIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  blockTimestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  blockNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
} as const;

export const FORGES_MAP = {
  0: 'GitHub',
  1: 'GitLab',
} as const;
