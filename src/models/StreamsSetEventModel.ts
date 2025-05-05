import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type {
  AccountId,
  BigIntString,
  DbSchema,
  IEventModel,
} from '../common/types';
import { COMMON_EVENT_INIT_ATTRIBUTES } from '../common/constants';

export type StreamsSetEventModelDataValues =
  StreamsSetEventModel['dataValues'] & {
    chain: DbSchema;
  };

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
        erc20: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        receiversHash: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        streamsHistoryHash: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        balance: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        maxEnd: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        ...COMMON_EVENT_INIT_ATTRIBUTES,
      },
      {
        sequelize,
        tableName: 'streams_set_events',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ['receiversHash'],
            name: `idx_streams_set_events_receiversHash`,
            unique: false,
          },
          {
            fields: ['accountId'],
            name: `idx_streams_set_events_accountId`,
            unique: false,
          },
        ],
      },
    );
  }
}
