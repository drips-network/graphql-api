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

export type ProjectDataValues = ProjectModel['dataValues'] & {
  chain: DbSchema;
};

export const PROJECT_VERIFICATION_STATUSES = [
  'claimed',
  'unclaimed',
  'pending_metadata',
] as const;

export type ProjectVerificationStatus =
  (typeof PROJECT_VERIFICATION_STATUSES)[number];

export type ProjectName = `${string}/${string}`;

export const FORGES = ['github', 'gitlab'] as const;
export type Forge = (typeof FORGES)[number];

export default class ProjectModel extends Model<
  InferAttributes<ProjectModel>,
  InferCreationAttributes<ProjectModel>
> {
  // Populated by `OwnerUpdated`
  public declare accountId: RepoDriverId;
  public declare ownerAddress: Address | null;
  public declare ownerAccountId: AddressDriverId | null;
  public declare claimedAt: Date | null;

  // Populated by `AccountMetadataEmitted`
  public declare url: string | null;
  public declare forge: Forge | null;
  public declare name: ProjectName | null;
  public declare emoji: string | null;
  public declare color: string | null;
  public declare avatarCid: string | null;
  public declare lastProcessedIpfsHash: string | null;

  // Common
  public declare verificationStatus: ProjectVerificationStatus;
  public declare isValid: boolean;
  public declare isVisible: boolean;
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
        isVisible: {
          allowNull: false,
          type: DataTypes.BOOLEAN,
        },
        name: {
          allowNull: true,
          type: DataTypes.STRING,
        },
        verificationStatus: {
          allowNull: false,
          type: DataTypes.ENUM(...PROJECT_VERIFICATION_STATUSES),
        },
        ownerAddress: {
          allowNull: true,
          type: DataTypes.STRING,
        },
        ownerAccountId: {
          allowNull: true,
          type: DataTypes.STRING,
        },
        forge: {
          allowNull: true,
          type: DataTypes.ENUM(...FORGES),
        },
        url: {
          allowNull: true,
          type: DataTypes.STRING,
        },
        emoji: {
          allowNull: true,
          type: DataTypes.STRING,
        },
        avatarCid: {
          allowNull: true,
          type: DataTypes.STRING,
        },
        color: {
          allowNull: true,
          type: DataTypes.STRING,
        },
        lastProcessedIpfsHash: {
          allowNull: true,
          type: DataTypes.TEXT,
        },
        lastProcessedVersion: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        claimedAt: {
          allowNull: true,
          type: DataTypes.DATE,
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
        tableName: 'projects',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ['ownerAddress'],
            name: 'idx_projects_owner_address',
          },
          {
            fields: ['verificationStatus'],
            name: 'idx_projects_verification_status',
          },
          {
            fields: ['url'],
            name: 'idx_projects_url',
          },
        ],
      },
    );
  }
}
