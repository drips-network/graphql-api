import type { AnyVersion } from '@efstajas/versioned-parser';
import { ethers, hexlify, toUtf8Bytes, zeroPadBytes } from 'ethers';
import { addressDriverAccountMetadataParser } from '../schemas';
import type { AccountId, IpfsHash } from '../common/types';
import appSettings from '../common/appSettings';
import AccountMetadataEmittedEventModel from '../models/AccountMetadataEmittedEventModel';

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

export async function getLatestMetadataHash(
  accountId: AccountId,
): Promise<IpfsHash | undefined> {
  const latestAccountMetadataEmittedEvent =
    await AccountMetadataEmittedEventModel.findAll({
      where: {
        accountId,
        key: zeroPadBytes(hexlify(toUtf8Bytes('ipfs')), 32),
      },
      order: [
        ['blockNumber', 'DESC'],
        ['logIndex', 'DESC'],
      ],
      limit: 1,
    });

  if (!latestAccountMetadataEmittedEvent.length) {
    return undefined;
  }

  return toIpfsHash(latestAccountMetadataEmittedEvent[0].value);
}

export default async function getLatestAccountMetadata(
  accountId: AccountId,
): Promise<
  | {
      metadata: AnyVersion<typeof addressDriverAccountMetadataParser>;
      ipfsHash: IpfsHash;
    }
  | undefined
> {
  const ipfsHash = await getLatestMetadataHash(accountId);
  if (!ipfsHash) return undefined;

  const ipfsFile = await (await getIpfsFile(ipfsHash)).json();
  const metadata = addressDriverAccountMetadataParser.parseAny(ipfsFile);

  return { metadata, ipfsHash };
}
