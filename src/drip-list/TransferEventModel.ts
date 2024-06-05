import type { AddressLike } from 'ethers';
import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type { CommonDataValues, DripListId } from '../common/types';
import { COMMON_EVENT_INIT_ATTRIBUTES } from '../common/constants';

export type TransferEventModelDataValues = TransferEventModel['dataValues'] &
  CommonDataValues;

export default class TransferEventModel extends Model<
  InferAttributes<TransferEventModel>,
  InferCreationAttributes<TransferEventModel>
> {
  public declare tokenId: DripListId; // The `tokenId` from `Transfer` event.
  public declare from: AddressLike;
  public declare to: AddressLike;

  // Common event log properties.
  public declare logIndex: number;
  public declare blockNumber: number;
  public declare blockTimestamp: Date;
  public declare transactionHash: string;

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        tokenId: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        from: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        to: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        ...COMMON_EVENT_INIT_ATTRIBUTES,
      },
      {
        sequelize,
        tableName: 'TransferEvents',
      },
    );
  }
}
