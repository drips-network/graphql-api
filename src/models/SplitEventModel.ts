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
  DbSchema,
  IEventModel,
} from '../common/types';
import { COMMON_EVENT_INIT_ATTRIBUTES } from '../common/constants';

export type SplitEventModelDataValues = SplitEventModel['dataValues'] & {
  chain: DbSchema;
};

export default class SplitEventModel
  extends Model<
    InferAttributes<SplitEventModel>,
    InferCreationAttributes<SplitEventModel>
  >
  implements IEventModel
{
  public declare accountId: AccountId;
  public declare receiver: AccountId;
  public declare erc20: Address;
  public declare amt: BigIntString;

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
        receiver: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        erc20: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        amt: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        ...COMMON_EVENT_INIT_ATTRIBUTES,
      },
      {
        sequelize,
        tableName: 'split_events',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ['receiver'],
            name: `idx_split_events_receiver`,
          },
          {
            fields: ['accountId', 'receiver'],
            name: `idx_split_events_accountId_receiver`,
          },
        ],
      },
    );
  }
}
