import type { AnyVersion } from '@efstajas/versioned-parser';
import { addressDriverAccountMetadataParser } from '../schemas';
import type { AccountId, AddressDriverId, DbSchema } from '../common/types';
import appSettings from '../common/appSettings';
import accountMetadataEmittedEventsQueries from '../dataLoaders/sqlQueries/accountMetadataEmittedEventsQueries';

async function getIpfsFile(hash: string): Promise<Response> {
  return fetch(`${appSettings.ipfsGatewayUrl}/ipfs/${hash}`);
}

export default async function getLatestAccountMetadataOnChain(
  chains: DbSchema[],
  accountId: AddressDriverId,
) {
  const accountMetadataEmittedEventModelDataValues =
    await accountMetadataEmittedEventsQueries.getByAccountId(chains, accountId);

  const response: {
    [chain in DbSchema]?: {
      metadata: AnyVersion<typeof addressDriverAccountMetadataParser>;
      ipfsHash: string;
    } | null;
  } = {};

  for (const metadataDataValues of accountMetadataEmittedEventModelDataValues) {
    if (!accountMetadataEmittedEventModelDataValues.length) {
      response[metadataDataValues.chain as DbSchema] = null;
    } else {
      const ipfsHash = accountMetadataEmittedEventModelDataValues[0].value;
      const ipfsFile = await (await getIpfsFile(ipfsHash)).json();
      const metadata = addressDriverAccountMetadataParser.parseAny(ipfsFile);

      response[metadataDataValues.chain as DbSchema] = {
        metadata,
        ipfsHash,
      };
    }
  }

  return response;
}

export async function getLatestMetadataHashOnChain(
  accountId: AccountId,
  chain: DbSchema,
): Promise<string | undefined> {
  // Ordered by blockNumber and logIndex.
  const latestAccountMetadataEmittedEvent =
    await accountMetadataEmittedEventsQueries.getByAccountId(
      [chain],
      accountId,
    );

  if (!latestAccountMetadataEmittedEvent.length) {
    return undefined;
  }

  return latestAccountMetadataEmittedEvent[0].value;
}
