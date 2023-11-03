import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type { AddressLike } from 'ethers';
import getSchema from '../utils/getSchema';
import type { AccountId, Forge, ProjectId } from '../common/types';
import { FORGES_MAP } from '../common/constants';

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
  public declare color: string | null;
  public declare description: string | null;
  public declare verificationStatus: ProjectVerificationStatus;

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
        color: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        schema: getSchema(),
        tableName: 'GitProjects',
      },
    );
  }
}
