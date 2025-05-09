import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type {
  DbSchema,
  NftDriverId,
  AccountId,
  Address,
} from '../common/types';

export type EcosystemDataValues = EcosystemMainAccountModel['dataValues'] & {
  chain: DbSchema;
};

export default class EcosystemMainAccountModel extends Model<
  InferAttributes<EcosystemMainAccountModel>,
  InferCreationAttributes<EcosystemMainAccountModel>
> {
  public declare accountId: NftDriverId;
  public declare isValid: boolean;
  public declare name: string | null;
  public declare creator: Address | null;
  public declare description: string | null;
  public declare ownerAddress: Address;
  public declare ownerAccountId: AccountId;
  public declare previousOwnerAddress: Address;
  public declare isVisible: boolean;
  public declare lastProcessedIpfsHash: string;
  public declare lastProcessedVersion: string;
  public declare createdAt: CreationOptional<Date>;
  public declare updatedAt: CreationOptional<Date>;

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        accountId: {
          primaryKey: true,
          type: DataTypes.STRING,
        },
        isValid: {
          allowNull: false,
          type: DataTypes.BOOLEAN,
        },
        ownerAddress: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        ownerAccountId: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        name: {
          allowNull: true,
          type: DataTypes.STRING,
        },
        description: {
          allowNull: true,
          type: DataTypes.TEXT,
        },
        creator: {
          allowNull: true,
          type: DataTypes.STRING,
        },
        previousOwnerAddress: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        isVisible: {
          allowNull: false,
          type: DataTypes.BOOLEAN,
        },
        lastProcessedIpfsHash: {
          allowNull: false,
          type: DataTypes.TEXT,
        },
        lastProcessedVersion: {
          allowNull: false,
          type: DataTypes.BIGINT,
        },
        createdAt: {
          allowNull: false,
          type: DataTypes.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: DataTypes.DATE,
        },
      },
      {
        sequelize,
        tableName: 'ecosystem_main_accounts',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ['ownerAddress'],
            name: `idx_ecosystem_main_accounts_owner_address`,
            where: {
              isValid: true,
            },
          },
        ],
      },
    );
  }
}
