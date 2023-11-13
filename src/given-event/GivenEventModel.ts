import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type { AccountId, Address, BigIntString } from '../common/types';
import getSchema from '../utils/getSchema';

export default class GivenEventModel
  extends Model<
    InferAttributes<GivenEventModel>,
    InferCreationAttributes<GivenEventModel>
  >
{
  public declare accountId: AccountId; // Sender of the Give
  public declare receiver: AccountId;
  public declare erc20: Address;
  public declare amt: BigIntString;

  // Common event log properties.
  public declare logIndex: number;
  public declare blockNumber: number;
  public declare blockTimestamp: Date;
  public declare transactionHash: string;

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        accountId: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        receiver: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        erc20: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        amt: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        transactionHash: {
          type: DataTypes.STRING,
          allowNull: false,
          primaryKey: true,
        },
        logIndex: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        blockTimestamp: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        blockNumber: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
      },
      {
        sequelize,
        schema: getSchema(),
        tableName: 'GivenEvents',
      },
    );
  }
}
