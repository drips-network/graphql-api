import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import getSchema from '../utils/getSchema';
import ProjectModel from '../project/ProjectModel';
import type { DripListAccountId, ProjectAccountId } from '../common/types';
import DripListModel from '../drip-list/DripListModel';

export enum RepoDriverSplitReceiverType {
  ProjectDependency = 'ProjectDependency',
  DripListDependency = 'DripListDependency',
}

export default class RepoDriverSplitReceiverModel extends Model<
  InferAttributes<RepoDriverSplitReceiverModel>,
  InferCreationAttributes<RepoDriverSplitReceiverModel>
> {
  public declare id: CreationOptional<number>; // Primary key
  public declare fundeeProjectId: ProjectAccountId; // Foreign key
  public declare funderProjectId: ProjectAccountId | null; // Foreign key
  public declare funderDripListId: DripListAccountId | null; // Foreign key

  public declare weight: number;
  public declare type: RepoDriverSplitReceiverType;

  // Associations
  public declare projectFundeeProject?: ProjectModel;
  public declare listFundeeProject?: ProjectModel;

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
        weight: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        type: {
          type: DataTypes.ENUM(...Object.values(RepoDriverSplitReceiverType)),
          allowNull: false,
        },
      },
      {
        sequelize,
        schema: getSchema(),
        tableName: 'RepoDriverSplitReceivers',
      },
    );
  }
}
