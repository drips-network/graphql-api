import type { AnyVersion } from '@efstajas/versioned-parser';
import { ethers } from 'ethers';
import { addressDriverAccountMetadataParser } from '../../schemas';
import type { AddressDriverId, IpfsHash } from '../../common/types';
import appSettings from '../../common/appSettings';
import AccountMetadataEmittedEventModel from '../../models/AccountMetadataEmittedEventModel';

function toIpfsHash(str: string): IpfsHash {
  const ipfsHash = ethers.toUtf8String(str);

  const isIpfsHash = /^(Qm[a-zA-Z0-9]{44})$/.test(ipfsHash);

  if (!isIpfsHash) {
    throw new Error('The provided string is not a valid IPFS hash.');
  }

  return ipfsHash as IpfsHash;
}

async function getIpfsFile(hash: IpfsHash): Promise<Response> {
  return fetch(`${appSettings.ipfsGatewayUrl}/ipfs/${hash}`);
}

export default async function getLatestAccountMetadata(
  accountId: AddressDriverId,
): Promise<{
  metadata: AnyVersion<typeof addressDriverAccountMetadataParser>;
  ipfsHash: IpfsHash;
}> {
  const latestAccountMetadataEmittedEvent =
    await AccountMetadataEmittedEventModel.findAll({
      where: { accountId },
      order: [
        ['blockNumber', 'DESC'],
        ['logIndex', 'DESC'],
      ],
      limit: 1,
    });

  if (!latestAccountMetadataEmittedEvent.length) {
    throw new Error(
      `No 'AccountMetadataEmitted' events found for account '${accountId}'.`,
    );
  }

  const ipfsHash = toIpfsHash(latestAccountMetadataEmittedEvent[0].value);

  const ipfsFile = await (await getIpfsFile(ipfsHash)).json();
  const metadata = addressDriverAccountMetadataParser.parseAny(ipfsFile);

  return { metadata, ipfsHash };
}
