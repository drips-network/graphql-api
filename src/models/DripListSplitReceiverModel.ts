import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import { DependencyType } from '../common/types';
import type { CommonDataValues, DripListId, ProjectId } from '../common/types';
import DripListModel from '../drip-list/DripListModel';
import ProjectModel from '../project/ProjectModel';

export type DripListSplitReceiverModelDataValues =
  DripListSplitReceiverModel['dataValues'] & CommonDataValues;

export default class DripListSplitReceiverModel extends Model<
  InferAttributes<DripListSplitReceiverModel>,
  InferCreationAttributes<DripListSplitReceiverModel>
> {
  public declare id: CreationOptional<number>; // Primary key
  public declare fundeeDripListId: DripListId; // Foreign key
  public declare funderProjectId: ProjectId | null; // Foreign key
  public declare funderDripListId: DripListId | null; // Foreign key

  public declare weight: number;
  public declare type: DependencyType;
  public declare blockTimestamp: Date;

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        fundeeDripListId: {
          // Foreign key
          type: DataTypes.STRING,
          references: {
            model: DripListModel,
            key: 'id',
          },
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
          type: DataTypes.ENUM(...Object.values(DependencyType)),
          allowNull: false,
        },
        blockTimestamp: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'DripListSplitReceivers',
      },
    );
  }
}
