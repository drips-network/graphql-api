import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import getSchema from '../utils/getSchema';
import type { AccountId, BigIntString, IEventModel } from '../common/types';
import getCommonEventAttributes from '../utils/getCommonEventAttributes';

export default class StreamReceiverSeenEventModel
  extends Model<
    InferAttributes<StreamReceiverSeenEventModel>,
    InferCreationAttributes<StreamReceiverSeenEventModel>
  >
  implements IEventModel
{
  public declare receiversHash: string;
  public declare accountId: AccountId;
  public declare config: BigIntString;

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
        config: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        receiversHash: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        ...getCommonEventAttributes(),
      },
      {
        sequelize,
        schema: getSchema(),
        tableName: 'StreamReceiverSeenEvents',
      },
    );
  }
}
