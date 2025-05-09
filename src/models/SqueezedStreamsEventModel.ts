import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import { COMMON_EVENT_INIT_ATTRIBUTES } from '../common/constants';
import type {
  AccountId,
  Address,
  BigIntString,
  IEventModel,
  StreamHistoryHashes,
} from '../common/types';

export default class SqueezedStreamsEventModel
  extends Model<
    InferAttributes<SqueezedStreamsEventModel>,
    InferCreationAttributes<SqueezedStreamsEventModel>
  >
  implements IEventModel
{
  public declare accountId: AccountId;
  public declare erc20: Address;
  public declare senderId: AccountId;
  public declare amount: BigIntString;
  public declare streamsHistoryHashes: StreamHistoryHashes;
  public declare logIndex: number;
  public declare blockNumber: number;
  public declare blockTimestamp: Date;
  public declare transactionHash: string;

  public static toStreamHistoryHashes(
    streamsHistoryHashes: string[],
  ): StreamHistoryHashes {
    return JSON.stringify(streamsHistoryHashes) as StreamHistoryHashes;
  }

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
        senderId: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        amount: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        streamsHistoryHashes: {
          allowNull: false,
          type: DataTypes.JSON,
        },
        ...COMMON_EVENT_INIT_ATTRIBUTES,
      },
      {
        sequelize,
        tableName: 'squeezed_streams_events',
        underscored: true,
        timestamps: true,
      },
    );
  }
}
