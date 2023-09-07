import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import getSchema from '../utils/getSchema';
import GitProjectModel from './GitProjectModel';

export default class RepoDriverSplitReceiverModel extends Model<
  InferAttributes<RepoDriverSplitReceiverModel>,
  InferCreationAttributes<RepoDriverSplitReceiverModel>
> {
  public declare id: CreationOptional<number>; // Primary key

  public declare selfProjectId: string; // Foreign key
  public declare funderProjectId: string; // Foreign key

  public declare weight: number;

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        selfProjectId: {
          // Foreign key
          type: DataTypes.STRING,
          references: {
            model: GitProjectModel,
            key: 'id',
          },
          allowNull: false,
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
      },
      {
        schema: getSchema(),
        tableName: 'RepoDriverSplitReceivers',
        sequelize,
      },
    );
  }
}
