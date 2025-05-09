import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type {
  DbSchema,
  IEventModel,
  AccountId,
  BigIntString,
} from '../common/types';
import { COMMON_EVENT_INIT_ATTRIBUTES } from '../common/constants';

export type StreamReceiverSeenEventModelDataValues =
  StreamReceiverSeenEventModel['dataValues'] & {
    chain: DbSchema;
  };

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
  public declare logIndex: number;
  public declare blockNumber: number;
  public declare blockTimestamp: Date;
  public declare transactionHash: string;

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        accountId: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        config: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        receiversHash: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        ...COMMON_EVENT_INIT_ATTRIBUTES,
      },
      {
        sequelize,
        tableName: 'stream_receiver_seen_events',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ['accountId'],
            name: `idx_stream_receiver_seen_events_accountId`,
            unique: false,
          },
        ],
      },
    );
  }
}
