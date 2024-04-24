import { DataTypes } from 'sequelize';

export default function getCommonEventAttributes(setDefaultPk = true) {
  return {
    transactionHash: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: setDefaultPk,
    },
    logIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: setDefaultPk,
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
}
