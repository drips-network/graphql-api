import type { AnyVersion } from '@efstajas/versioned-parser';
import { ethers } from 'ethers';
import { addressDriverAccountMetadataParser } from '../schemas';
import type { AddressDriverId, IpfsHash } from '../common/types';
import appSettings from '../common/appSettings';
import type { SupportedChain } from '../generated/graphql';
import accountMetadataEmittedEventsQueries from '../dataLoaders/sqlQueries/accountMetadataEmittedEventsQueries';

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

export default async function getLatestAccountMetadataByChain(
  chains: SupportedChain[],
  accountId: AddressDriverId,
) {
  const accountMetadataEmittedEventModelDataValues =
    await accountMetadataEmittedEventsQueries.getByAccountId(chains, accountId);

  const response: {
    [chain in SupportedChain]?: {
      metadata: AnyVersion<typeof addressDriverAccountMetadataParser>;
      ipfsHash: IpfsHash;
    } | null;
  } = {};

  for (const metadataDataValues of accountMetadataEmittedEventModelDataValues) {
    if (!accountMetadataEmittedEventModelDataValues.length) {
      response[metadataDataValues.chain as SupportedChain] = null;
    } else {
      const ipfsHash = toIpfsHash(
        accountMetadataEmittedEventModelDataValues[0].value,
      );

      const ipfsFile = await (await getIpfsFile(ipfsHash)).json();
      const metadata = addressDriverAccountMetadataParser.parseAny(ipfsFile);

      response[metadataDataValues.chain as SupportedChain] = {
        metadata,
        ipfsHash,
      };
    }
  }

  return response;
}
