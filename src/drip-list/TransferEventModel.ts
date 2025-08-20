import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import { COMMON_EVENT_INIT_ATTRIBUTES } from '../common/constants';
import type {
  Address,
  DbSchema,
  IEventModel,
  NftDriverId,
} from '../common/types';

export type TransferEventModelDataValues = TransferEventModel['dataValues'] & {
  chain: DbSchema;
};

export default class TransferEventModel
  extends Model<
    InferAttributes<TransferEventModel>,
    InferCreationAttributes<TransferEventModel>
  >
  implements IEventModel
{
  public declare tokenId: NftDriverId; // The `tokenId` from `Transfer` event.
  public declare from: Address;
  public declare to: Address;
  public declare logIndex: number;
  public declare blockNumber: number;
  public declare blockTimestamp: Date;
  public declare transactionHash: string;

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        tokenId: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        from: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        to: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        ...COMMON_EVENT_INIT_ATTRIBUTES,
      },
      {
        sequelize,
        tableName: 'transfer_events',
        underscored: true,
        timestamps: true,
      },
    );
  }
}
