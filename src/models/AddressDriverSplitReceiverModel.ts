import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type { AddressLike } from 'ethers';
import getSchema from '../utils/getSchema';
import type {
  AddressAccountId,
  DripListAccountId,
  ProjectAccountId,
} from '../common/types';
import ProjectModel from '../project/ProjectModel';
import DripListModel from '../drip-list/DripListModel';

export enum AddressDriverSplitReceiverType {
  ProjectMaintainer = 'ProjectMaintainer',
  ProjectDependency = 'ProjectDependency',
  DripListDependency = 'DripListDependency',
}

export default class AddressDriverSplitReceiverModel extends Model<
  InferAttributes<AddressDriverSplitReceiverModel>,
  InferCreationAttributes<AddressDriverSplitReceiverModel>
> {
  public declare id: CreationOptional<number>; // Primary key
  public declare funderProjectId: ProjectAccountId | null; // Foreign key
  public declare funderDripListId: DripListAccountId | null; // Foreign key

  public declare weight: number;
  public declare type: AddressDriverSplitReceiverType;
  public declare fundeeAccountId: AddressAccountId;
  public declare fundeeAccountAddress: AddressLike;

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        fundeeAccountId: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        fundeeAccountAddress: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        funderProjectId: {
          // Foreign key
          type: DataTypes.STRING,
          references: {
            model: ProjectModel,
            key: 'id',
          },
          allowNull: true,
        },
        funderDripListId: {
          // Foreign key
          type: DataTypes.STRING,
          references: {
            model: DripListModel,
            key: 'id',
          },
          allowNull: true,
        },
        weight: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        type: {
          type: DataTypes.ENUM(
            ...Object.values(AddressDriverSplitReceiverType),
          ),
          allowNull: false,
        },
      },
      {
        sequelize,
        schema: getSchema(),
        tableName: 'AddressDriverSplitReceivers',
      },
    );
  }
}
