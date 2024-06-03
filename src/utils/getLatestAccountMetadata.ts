import type { AnyVersion } from '@efstajas/versioned-parser';
import { ethers } from 'ethers';
import { QueryTypes } from 'sequelize';
import { addressDriverAccountMetadataParser } from '../schemas';
import type { AddressDriverId, IpfsHash } from '../common/types';
import appSettings from '../common/appSettings';
import type { AccountMetadataEmittedEventModelDataValues } from '../models/AccountMetadataEmittedEventModel';
import AccountMetadataEmittedEventModel from '../models/AccountMetadataEmittedEventModel';
import type { SupportedChain } from '../generated/graphql';
import { dbConnection } from '../database/connectToDatabase';

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
  // Define base SQL to query from multiple chains (schemas).
  const baseSQL = (schema: SupportedChain) =>
    `SELECT *,'${schema}' AS chain FROM "${schema}"."AccountMetadataEmittedEvents"`;

  // Initialize the WHERE clause parts.
  const conditions: string[] = ['"accountId" = :accountId'];
  const parameters: { [key: string]: any } = { accountId };

  // Build the where clause.
  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  // Define the order.
  const orderClause = ' ORDER BY "blockNumber" DESC, "logIndex" DESC';

  // Build the SQL for each specified schema.
  const queries = chains.map(
    (chain) => baseSQL(chain) + whereClause + orderClause,
  );

  // Combine all schema queries with UNION.
  const fullQuery = `${queries.join(' UNION ')} LIMIT 1000`;

  const accountMetadataEmittedEventModelDataValues = (
    await dbConnection.query(fullQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: AccountMetadataEmittedEventModel,
    })
  ).map((p) => p.dataValues as AccountMetadataEmittedEventModelDataValues);

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
