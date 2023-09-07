import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import getSchema from '../utils/getSchema';

enum ProjectVerificationStatus {
  Claimed = 'Claimed',
  Started = 'Started',
  Unclaimed = 'Unclaimed',
  PendingOwner = 'PendingOwner',
  PendingMetadata = 'PendingMetadata',
}

export const SUPPORTED_FORGES = ['Github', 'Gitlab'] as const;
export type Forge = (typeof SUPPORTED_FORGES)[number];

export default class GitProjectModel extends Model<
  InferAttributes<GitProjectModel>,
  InferCreationAttributes<GitProjectModel>
> {
  // Properties from events.
  public declare id: string; // The `accountId` from `OwnerUpdatedRequested` event.
  public declare name: string;
  public declare forge: Forge;
  public declare owner: string | null;

  // Properties from metadata.
  public declare url: string | null;
  public declare emoji: string | null;
  public declare color: string | null;
  public declare ownerName: string | null;
  public declare description: string | null;
  public declare verificationStatus: ProjectVerificationStatus;

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        owner: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        url: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        emoji: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        color: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        description: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        ownerName: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        verificationStatus: {
          type: DataTypes.ENUM(...Object.values(ProjectVerificationStatus)),
          allowNull: false,
        },
        forge: {
          type: DataTypes.ENUM(...Object.values(SUPPORTED_FORGES)),
          allowNull: false,
        },
      },
      {
        schema: getSchema(),
        tableName: 'GitProjects',
        sequelize,
      },
    );
  }
}
