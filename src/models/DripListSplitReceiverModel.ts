import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import getSchema from '../utils/getSchema';
import type { DripListId } from '../common/types';
import DripListModel from '../drip-list/DripListModel';

export default class DripListSplitReceiverModel extends Model<
  InferAttributes<DripListSplitReceiverModel>,
  InferCreationAttributes<DripListSplitReceiverModel>
> {
  public declare id: CreationOptional<number>; // Primary key
  public declare fundeeDripListId: DripListId; // Foreign key
  public declare funderDripListId: DripListId; // Foreign key

  public declare weight: number;

  public declare listFundeeList?: DripListModel;

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
        funderDripListId: {
          // Foreign key
          type: DataTypes.STRING,
          references: {
            model: DripListModel,
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
        sequelize,
        schema: getSchema(),
        tableName: 'DripListSplitReceivers',
      },
    );
  }
}
