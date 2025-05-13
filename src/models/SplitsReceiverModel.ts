import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type { AccountId, DbSchema } from '../common/types';
import type { AccountType, RelationshipType } from '../utils/splitRules';
import { ACCOUNT_TYPES, RELATIONSHIP_TYPES } from '../utils/splitRules';

export type SplitsReceiverModelDataValues =
  SplitsReceiverModel['dataValues'] & {
    chain: DbSchema;
  };

export default class SplitsReceiverModel extends Model<
  InferAttributes<SplitsReceiverModel>,
  InferCreationAttributes<SplitsReceiverModel>
> {
  public declare id: CreationOptional<number>;
  public declare receiverAccountId: AccountId;
  public declare receiverAccountType: AccountType;
  public declare senderAccountId: AccountId;
  public declare senderAccountType: AccountType;
  public declare relationshipType: RelationshipType;
  public declare weight: number;
  public declare blockTimestamp: Date;
  public declare splitsToRepoDriverSubAccount: boolean | undefined;
  public declare createdAt: CreationOptional<Date>;
  public declare updatedAt: CreationOptional<Date>;

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        id: {
          primaryKey: true,
          autoIncrement: true,
          type: DataTypes.INTEGER,
        },
        receiverAccountId: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        receiverAccountType: {
          allowNull: false,
          type: DataTypes.ENUM(...ACCOUNT_TYPES),
        },
        senderAccountId: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        senderAccountType: {
          allowNull: false,
          type: DataTypes.ENUM(...ACCOUNT_TYPES),
        },
        relationshipType: {
          allowNull: false,
          type: DataTypes.ENUM(...RELATIONSHIP_TYPES),
        },
        splitsToRepoDriverSubAccount: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
        },
        weight: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        blockTimestamp: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'splits_receivers',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ['receiverAccountId', 'senderAccountId'],
            name: 'idx_split_receivers_receiver_sender',
          },
          {
            fields: ['senderAccountId', 'receiverAccountId'],
            name: 'idx_split_receivers_sender_receiver',
          },
        ],
      },
    );
  }
}
