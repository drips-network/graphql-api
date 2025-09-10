import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type {
  DbSchema,
  RepoDriverId,
  AddressDriverId,
  Address,
} from '../common/types';

export type LinkedIdentityDataValues = LinkedIdentityModel['dataValues'] & {
  chain: DbSchema;
};

export const LINKED_IDENTITY_TYPES = ['orcid'] as const;
export type LinkedIdentityType = (typeof LINKED_IDENTITY_TYPES)[number];

export default class LinkedIdentityModel extends Model<
  InferAttributes<LinkedIdentityModel>,
  InferCreationAttributes<LinkedIdentityModel>
> {
  public declare accountId: RepoDriverId;
  public declare identityType: LinkedIdentityType;
  public declare ownerAddress: Address | null;
  public declare ownerAccountId: AddressDriverId | null;
  public declare isLinked: boolean;
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
        identityType: {
          allowNull: false,
          type: DataTypes.ENUM(...LINKED_IDENTITY_TYPES),
        },
        ownerAddress: {
          allowNull: true,
          type: DataTypes.STRING,
        },
        ownerAccountId: {
          allowNull: true,
          type: DataTypes.STRING,
        },
        isLinked: {
          allowNull: false,
          type: DataTypes.BOOLEAN,
        },
        lastProcessedVersion: {
          allowNull: false,
          type: DataTypes.STRING,
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
        tableName: 'linked_identities',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ['ownerAddress'],
            name: 'idx_linked_identities_owner_address',
          },
          {
            fields: ['identityType'],
            name: 'idx_linked_identities_identity_type',
          },
        ],
      },
    );
  }
}
