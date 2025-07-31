import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type { AccountType } from '../utils/splitRules';
import type {
  ImmutableSplitsDriverId,
  AccountId,
  DbSchema,
} from '../common/types';

export type SubListDataValues = SubListModel['dataValues'] & {
  chain: DbSchema;
};

export default class SubListModel extends Model<
  InferAttributes<SubListModel>,
  InferCreationAttributes<SubListModel>
> {
  public declare accountId: ImmutableSplitsDriverId;
  public declare parentAccountId: AccountId;
  public declare parentAccountType: AccountType;
  public declare rootAccountId: AccountId;
  public declare rootAccountType: AccountType;
  public declare lastProcessedIpfsHash: string;
  public declare isValid: boolean;
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
        parentAccountId: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        parentAccountType: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        rootAccountId: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        rootAccountType: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        lastProcessedIpfsHash: {
          type: DataTypes.TEXT,
          allowNull: false,
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
        tableName: 'sub_lists',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ['accountId'],
            name: 'idx_sub_lists_account_id',
          },
          {
            fields: ['parentId'],
            name: 'idx_sub_lists_parent_id',
          },
          {
            fields: ['rootId'],
            name: 'idx_sub_lists_root_id',
          },
        ],
      },
    );
  }
}
