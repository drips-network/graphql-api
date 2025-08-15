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
  DbSchema,
  IEventModel,
} from '../common/types';

export type GivenEventModelDataValues = GivenEventModel['dataValues'] & {
  chain: DbSchema;
};

export default class GivenEventModel
  extends Model<
    InferAttributes<GivenEventModel>,
    InferCreationAttributes<GivenEventModel>
  >
  implements IEventModel
{
  public declare accountId: AccountId; // Sender of the Give
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
        tableName: 'given_events',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ['accountId'],
            name: `idx_given_events_accountId`,
          },
          {
            fields: ['receiver'],
            name: `idx_given_events_receiver`,
          },
          {
            fields: ['erc20'],
            name: `idx_given_events_erc20`,
          },
          {
            fields: ['transactionHash', 'logIndex'],
            name: `idx_given_events_transactionHash_logIndex`,
          },
        ],
      },
    );
  }
}
