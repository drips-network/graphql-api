import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import getSchema from '../utils/getSchema';
import type { AccountId, Address, BigIntString } from '../common/types';
import { COMMON_EVENT_INIT_ATTRIBUTES } from '../common/constants';

export default class SplitEventModel extends Model<
  InferAttributes<SplitEventModel>,
  InferCreationAttributes<SplitEventModel>
> {
  public declare accountId: AccountId;
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
        ...COMMON_EVENT_INIT_ATTRIBUTES,
      },
      {
        sequelize,
        schema: getSchema(),
        tableName: 'SplitEvents',
      },
    );
  }
}
