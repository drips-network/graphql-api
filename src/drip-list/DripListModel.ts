import type {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type { AddressLike } from 'ethers';
import type { DripListId } from '../common/types';
import getSchema from '../utils/getSchema';
import type RepoDriverSplitReceiverModel from '../models/RepoDriverSplitReceiverModel';
import type AddressDriverSplitReceiverModel from '../models/AddressDriverSplitReceiverModel';
import type DripListSplitReceiverModel from '../models/DripListSplitReceiverModel';

export default class DripListModel extends Model<
  InferAttributes<DripListModel>,
  InferCreationAttributes<DripListModel>
> {
  public declare id: DripListId; // The `tokenId` from `TransferEvent` event.

  // Properties from metadata.
  public declare isPublic: false;
  public declare name: string | null;
  public declare ownerAddress: AddressLike;
  public declare previousOwnerAddress: AddressLike;
  public declare projectsJson: string | null;
  // TODO: add description after metadata v3 is updated.

  // Associations
  public declare listNftSplits?: DripListSplitReceiverModel[];
  public declare listRepoSplits?: RepoDriverSplitReceiverModel[];
  public declare listAddressSplits?: AddressDriverSplitReceiverModel[];

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
        },
        projectsJson: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        ownerAddress: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        previousOwnerAddress: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        isPublic: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
        },
      },
      {
        sequelize,
        schema: getSchema(),
        tableName: 'DripLists',
      },
    );
  }
}
