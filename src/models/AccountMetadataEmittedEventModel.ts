import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type { IEventModel, AccountId, DbSchema } from '../common/types';
import { COMMON_EVENT_INIT_ATTRIBUTES } from '../common/constants';

export type AccountMetadataEmittedEventModelDataValues =
  AccountMetadataEmittedEventModel['dataValues'] & {
    chain: DbSchema;
  };

export default class AccountMetadataEmittedEventModel
  extends Model<
    InferAttributes<AccountMetadataEmittedEventModel>,
    InferCreationAttributes<AccountMetadataEmittedEventModel>
  >
  implements IEventModel
{
  public declare key: string;
  public declare value: string;
  public declare accountId: AccountId;
  public declare logIndex: number;
  public declare blockNumber: number;
  public declare blockTimestamp: Date;
  public declare transactionHash: string;

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        key: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        value: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        accountId: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        ...COMMON_EVENT_INIT_ATTRIBUTES,
      },
      {
        sequelize,
        tableName: 'account_metadata_emitted_events',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ['accountId'],
            name: 'idx_account_metadata_emitted_events_accountId',
          },
        ],
      },
    );
  }
}
