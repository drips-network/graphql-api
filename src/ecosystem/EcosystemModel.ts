import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type { AddressLike } from 'ethers';
import type { AccountId, CommonDataValues, NftDriverId } from '../common/types';

export type EcosystemDataValues = EcosystemModel['dataValues'] &
  CommonDataValues;

export default class EcosystemModel extends Model<
  InferAttributes<EcosystemModel>,
  InferCreationAttributes<EcosystemModel>
> {
  public declare id: NftDriverId;
  public declare isValid: boolean;
  public declare name: string | null;
  public declare creator: AddressLike;
  public declare description: string | null;
  public declare ownerAddress: AddressLike;
  public declare ownerAccountId: AccountId;
  public declare previousOwnerAddress: AddressLike;
  public declare isVisible: boolean;
  public declare lastProcessedIpfsHash: string | null;

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
        },
        isValid: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
        },
        ownerAddress: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        ownerAccountId: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        creator: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        previousOwnerAddress: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        isVisible: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
        },
        lastProcessedIpfsHash: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'Ecosystems',
      },
    );
  }
}
