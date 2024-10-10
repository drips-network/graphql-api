import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type {
  AccountId,
  Address,
  BigIntString,
  IEventModel,
  StreamHistoryHashes,
} from '../common/types';
import { COMMON_EVENT_INIT_ATTRIBUTES } from '../common/constants';

export default class SqueezedStreamsEventModel
  extends Model<
    InferAttributes<SqueezedStreamsEventModel>,
    InferCreationAttributes<SqueezedStreamsEventModel>
  >
  implements IEventModel
{
  // Properties from event output.
  public declare accountId: AccountId;
  public declare erc20: Address;
  public declare senderId: AccountId;
  public declare amount: BigIntString;
  public declare streamsHistoryHashes: StreamHistoryHashes;

  // Common event log properties.
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
          type: DataTypes.STRING,
          allowNull: false,
        },
        erc20: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        senderId: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        amount: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        streamsHistoryHashes: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        ...COMMON_EVENT_INIT_ATTRIBUTES,
      },
      {
        sequelize,
        tableName: 'SqueezedStreamsEvents',
      },
    );
  }
}
