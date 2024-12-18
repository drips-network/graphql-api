import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type { AddressLike } from 'ethers';
import type {
  AccountId,
  CommonDataValues,
  Forge,
  ProjectId,
} from '../common/types';
import { FORGES_MAP } from '../common/constants';

export type ProjectDataValues = ProjectModel['dataValues'] & CommonDataValues;

export enum ProjectVerificationStatus {
  Claimed = 'Claimed',
  OwnerUpdateRequested = 'OwnerUpdateRequested',
  OwnerUpdated = 'OwnerUpdated',
  Unclaimed = 'Unclaimed',
  PendingOwner = 'PendingOwner',
  PendingMetadata = 'PendingMetadata',
}

export default class ProjectModel extends Model<
  InferAttributes<ProjectModel>,
  InferCreationAttributes<ProjectModel>
> {
  public declare id: ProjectId; // The `accountId` from `OwnerUpdatedRequested` event.
  public declare isValid: boolean;
  public declare name: string | null;
  public declare forge: Forge | null;
  public declare ownerAddress: AddressLike | null;
  public declare ownerAccountId: AccountId | null;

  public declare url: string | null;
  public declare emoji: string | null;
  public declare avatarCid: string | null;
  public declare color: string | null;
  public declare description: string | null;
  public declare verificationStatus: ProjectVerificationStatus;
  public declare isVisible: boolean;
  public declare lastProcessedIpfsHash: string | null;

  public declare claimedAt: Date | null;

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
        name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        verificationStatus: {
          type: DataTypes.ENUM(...Object.values(ProjectVerificationStatus)),
          allowNull: false,
        },
        claimedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        forge: {
          type: DataTypes.ENUM(...Object.values(FORGES_MAP)),
          allowNull: true,
        },
        ownerAddress: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        ownerAccountId: {
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
        avatarCid: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        color: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
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
        tableName: 'GitProjects',
      },
    );
  }
}
