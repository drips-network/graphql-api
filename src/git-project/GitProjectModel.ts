import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type { AddressLike } from 'ethers';
import getSchema from '../utils/getSchema';
import type { Forge, ProjectId } from '../common/types';
import { FORGES_MAP } from '../common/constants';
import type RepoDriverSplitReceiverModel from '../models/RepoDriverSplitReceiverModel';
import type AddressDriverSplitReceiverModel from '../models/AddressDriverSplitReceiverModel';

export enum ProjectVerificationStatus {
  Claimed = 'Claimed',
  OwnerUpdateRequested = 'OwnerUpdateRequested',
  OwnerUpdated = 'OwnerUpdated',
  Unclaimed = 'Unclaimed',
  PendingOwner = 'PendingOwner',
  PendingMetadata = 'PendingMetadata',
}

export default class GitProjectModel extends Model<
  InferAttributes<GitProjectModel>,
  InferCreationAttributes<GitProjectModel>
> {
  // Properties from events
  public declare id: ProjectId; // The `accountId` from `OwnerUpdatedRequested` event.
  public declare name: string | null;
  public declare forge: Forge | null;
  public declare ownerAddress: AddressLike | null;

  // Properties from metadata
  public declare url: string | null;
  public declare emoji: string | null;
  public declare color: string | null;
  public declare ownerName: string | null;
  public declare splitsJson: string | null;
  public declare description: string | null;
  public declare verificationStatus: ProjectVerificationStatus;

  // Associations
  public declare projectRepoSplits?: RepoDriverSplitReceiverModel[];
  public declare projectAddressSplits?: AddressDriverSplitReceiverModel[];

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
        },
        splitsJson: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        ownerAddress: {
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
          type: DataTypes.ENUM(...Object.values(FORGES_MAP)),
          allowNull: false,
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
