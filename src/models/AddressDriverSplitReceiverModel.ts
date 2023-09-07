import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import getSchema from '../utils/getSchema';
import GitProjectModel from './GitProjectModel';

enum AddressDriverSplitReceiverType {
  Maintainer = 'Maintainer',
  Dependency = 'Dependency',
}

export default class AddressDriverSplitReceiverModel extends Model<
  InferAttributes<AddressDriverSplitReceiverModel>,
  InferCreationAttributes<AddressDriverSplitReceiverModel>
> {
  public declare id: CreationOptional<number>; // Primary key
  public declare funderProjectId: string; // Foreign key

  public declare weight: number;
  public declare accountId: string;
  public declare type: AddressDriverSplitReceiverType;

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        funderProjectId: {
          // Foreign key
          type: DataTypes.STRING,
          references: {
            model: GitProjectModel,
            key: 'id',
          },
          allowNull: false,
        },
        weight: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        accountId: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        type: {
          type: DataTypes.ENUM(
            ...Object.values(AddressDriverSplitReceiverType),
          ),
          allowNull: true,
        },
      },
      {
        schema: getSchema(),
        tableName: 'AddressDriverSplitReceivers',
        sequelize,
      },
    );
  }
}
