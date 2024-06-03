import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import getSchema from '../utils/getSchema';
import type {
  AccountId,
  BigIntString,
  CommonDataValues,
  IEventModel,
} from '../common/types';
import getCommonEventAttributes from '../utils/getCommonEventAttributes';

export type StreamsSetEventModelDataValues =
  StreamsSetEventModel['dataValues'] & CommonDataValues;

export default class StreamsSetEventModel
  extends Model<
    InferAttributes<StreamsSetEventModel>,
    InferCreationAttributes<StreamsSetEventModel>
  >
  implements IEventModel
{
  public declare accountId: AccountId;
  public declare erc20: string;
  public declare receiversHash: string;
  public declare streamsHistoryHash: string;
  public declare balance: BigIntString;
  public declare maxEnd: BigIntString;

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
        erc20: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        receiversHash: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        streamsHistoryHash: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        balance: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        maxEnd: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        ...getCommonEventAttributes(),
      },
      {
        sequelize,
        schema: getSchema(),
        tableName: 'StreamsSetEvents',
      },
    );
  }
}
