import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import getSchema from '../utils/getSchema';
import type { DripListId, ProjectId } from '../common/types';
import DripListModel from '../drip-list/DripListModel';
import GitProjectModel from '../git-project/GitProjectModel';

export default class DripListSplitReceiverModel extends Model<
  InferAttributes<DripListSplitReceiverModel>,
  InferCreationAttributes<DripListSplitReceiverModel>
> {
  public declare id: CreationOptional<number>; // Primary key
  public declare fundeeDripListId: DripListId; // Foreign key
  public declare funderProjectId: ProjectId | null; // Foreign key
  public declare funderDripListId: DripListId | null; // Foreign key

  public declare weight: number;

  public declare listFundeeList?: DripListModel;
  public declare projectFundeeList?: DripListModel;

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
            model: GitProjectModel,
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
      },
      {
        sequelize,
        schema: getSchema(),
        tableName: 'DripListSplitReceivers',
      },
    );
  }
}
