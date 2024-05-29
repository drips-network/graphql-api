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
  AddressDriverId,
  CommonDataValues,
  DripListId,
  ProjectId,
} from '../common/types';
import DripListModel from '../drip-list/DripListModel';
import ProjectModel from '../project/ProjectModel';

export type AddressDriverSplitReceiverModelDataValues =
  AddressDriverSplitReceiverModel['dataValues'] & CommonDataValues;

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
  public declare funderProjectId: ProjectId | null; // Foreign key
  public declare funderDripListId: DripListId | null; // Foreign key

  public declare weight: number;
  public declare type: AddressDriverSplitReceiverType;
  public declare fundeeAccountId: AddressDriverId;
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
