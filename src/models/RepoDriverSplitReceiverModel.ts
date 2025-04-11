import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type {
  CommonDataValues,
  NftDriverId,
  RepoDriverId,
} from '../common/types';
import { DependencyType } from '../common/types';
import ProjectModel from '../project/ProjectModel';
import DripListModel from '../drip-list/DripListModel';
import EcosystemMainAccountModel from '../ecosystem/EcosystemMainAccountModel';

export type RepoDriverSplitReceiverModelDataValues =
  RepoDriverSplitReceiverModel['dataValues'] & CommonDataValues;

export default class RepoDriverSplitReceiverModel extends Model<
  InferAttributes<RepoDriverSplitReceiverModel>,
  InferCreationAttributes<RepoDriverSplitReceiverModel>
> {
  public declare id: CreationOptional<number>; // Primary key
  public declare fundeeProjectId: RepoDriverId; // Foreign key
  public declare funderProjectId: RepoDriverId | null; // Foreign key
  public declare funderDripListId: NftDriverId | null; // Foreign key
  public declare funderEcosystemId: NftDriverId | null; // Foreign key

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
        fundeeProjectId: {
          // Foreign key
          type: DataTypes.STRING,
          references: {
            model: ProjectModel,
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
        funderEcosystemId: {
          // Foreign key
          type: DataTypes.STRING,
          references: {
            model: EcosystemMainAccountModel,
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
        tableName: 'RepoDriverSplitReceivers',
      },
    );
  }
}
