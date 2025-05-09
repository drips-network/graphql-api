import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type { UUID } from 'crypto';
import type {
  AccountId,
  Address,
  DbSchema,
  NftDriverId,
} from '../common/types';

export type DripListDataValues = DripListModel['dataValues'] & {
  chain: DbSchema;
};

export default class DripListModel extends Model<
  InferAttributes<DripListModel>,
  InferCreationAttributes<DripListModel>
> {
  public declare accountId: NftDriverId;
  public declare isValid: boolean;
  public declare name: string | null;
  public declare creator: Address | null;
  public declare description: string | null;
  public declare ownerAddress: Address;
  public declare ownerAccountId: AccountId;
  public declare previousOwnerAddress: Address | null;
  public declare latestVotingRoundId: UUID | null;
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
        latestVotingRoundId: {
          allowNull: true,
          type: DataTypes.UUID,
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
          allowNull: true,
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
        tableName: 'drip_lists',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ['ownerAddress'],
            name: `idx_drip_lists_owner_address`,
            where: {
              isValid: true,
            },
          },
        ],
      },
    );
  }
}
