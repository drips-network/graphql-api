import { FetchRequest, JsonRpcProvider, ethers } from 'ethers';
import appSettings from './appSettings';
import type { AddressDriver, Drips, RepoDriver } from '../generated/contracts';
import {
  AddressDriver__factory,
  Drips__factory,
  RepoDriver__factory,
} from '../generated/contracts';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import { SupportedChain } from '../generated/graphql';
import type {
  AccountId,
  Address,
  AddressDriverId,
  DbSchema,
  Forge,
  ProjectId,
} from './types';
import { dbSchemaToChain } from '../utils/chainSchemaMappings';

const chainConfigs: Record<
  SupportedChain,
  {
    dripsAddress: string;
    addressDriverAddress: string;
    repoDriverAddress: string;
  }
> = {
  MAINNET: {
    dripsAddress: '0xd0Dd053392db676D57317CD4fe96Fc2cCf42D0b4',
    addressDriverAddress: '0x1455d9bD6B98f95dd8FEB2b3D60ed825fcef0610',
    repoDriverAddress: '0x770023d55D09A9C110694827F1a6B32D5c2b373E',
  },
  SEPOLIA: {
    dripsAddress: '0x74A32a38D945b9527524900429b083547DeB9bF4',
    addressDriverAddress: '0x70E1E1437AeFe8024B6780C94490662b45C3B567',
    repoDriverAddress: '0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B',
  },
  OPTIMISM_SEPOLIA: {
    dripsAddress: '0x74A32a38D945b9527524900429b083547DeB9bF4',
    addressDriverAddress: '0x70E1E1437AeFe8024B6780C94490662b45C3B567',
    repoDriverAddress: '0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B',
  },
  POLYGON_AMOY: {
    dripsAddress: '0xeebCd570e50fa31bcf6eF10f989429C87C3A6981',
    addressDriverAddress: '0x004310a6d47893Dd6e443cbE471c24aDA1e6c619',
    repoDriverAddress: '0x54372850Db72915Fd9C5EC745683EB607b4a8642',
  },
  BASE_SEPOLIA: {
    dripsAddress: '0xeebCd570e50fa31bcf6eF10f989429C87C3A6981',
    addressDriverAddress: '0x004310a6d47893Dd6e443cbE471c24aDA1e6c619',
    repoDriverAddress: '0x54372850Db72915Fd9C5EC745683EB607b4a8642',
  },
  FILECOIN: {
    dripsAddress: '0xd320F59F109c618b19707ea5C5F068020eA333B3',
    addressDriverAddress: '0x04693D13826a37dDdF973Be4275546Ad978cb9EE',
    repoDriverAddress: '0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257',
  },
  METIS: {
    dripsAddress: '0xd320F59F109c618b19707ea5C5F068020eA333B3',
    addressDriverAddress: '0x04693D13826a37dDdF973Be4275546Ad978cb9EE',
    repoDriverAddress: '0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257',
  },
  LOCALTESTNET: {
    dripsAddress: '0x7CBbD3FdF9E5eb359E6D9B12848c5Faa81629944',
    addressDriverAddress: '0x1707De7b41A3915F990A663d27AD3a952D50151d',
    repoDriverAddress: '0x971e08fc533d2A5f228c7944E511611dA3B56B24',
  },
  OPTIMISM: {
    dripsAddress: '0xd320F59F109c618b19707ea5C5F068020eA333B3',
    addressDriverAddress: '0x04693D13826a37dDdF973Be4275546Ad978cb9EE',
    repoDriverAddress: '0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257',
  },
};

const { rpcConfig } = appSettings;

const providers: {
  [network in SupportedChain]?: JsonRpcProvider;
} = {};

function createAuthFetchRequest(rpcUrl: string, token: string): FetchRequest {
  const fetchRequest = new FetchRequest(rpcUrl);
  fetchRequest.method = 'POST';
  fetchRequest.setHeader('Content-Type', 'application/json');
  fetchRequest.setHeader('Authorization', `Bearer ${token}`);
  return fetchRequest;
}

Object.values(SupportedChain).forEach((network) => {
  const config = rpcConfig[network];

  if (!config) {
    return;
  }

  const { url, accessToken } = config;

  const endpoint = accessToken ? createAuthFetchRequest(url, accessToken) : url;

  providers[network] = new JsonRpcProvider(
    endpoint,
    undefined, // network
    undefined, // options
  );
});

const dripsContracts: {
  [network in SupportedChain]?: {
    drips: Drips;
    addressDriver: AddressDriver;
    repoDriver: RepoDriver;
  };
} = {};

Object.entries(providers).forEach(([network, provider]) => {
  if (!chainConfigs[network as SupportedChain]) {
    throw new Error(`Missing chain config for network '${network}'.`);
  }

  const { addressDriverAddress, repoDriverAddress, dripsAddress } =
    chainConfigs[network as SupportedChain];

  const addressDriver = AddressDriver__factory.connect(
    addressDriverAddress,
    provider,
  );
  const repoDriver = RepoDriver__factory.connect(repoDriverAddress, provider);

  const drips = Drips__factory.connect(dripsAddress, provider);

  dripsContracts[network as SupportedChain] = {
    drips,
    addressDriver,
    repoDriver,
  };
});

export default dripsContracts;

export async function getCrossChainAddressDriverAccountIdByAddress(
  address: Address,
  chainsToQuery: DbSchema[],
): Promise<AddressDriverId> {
  // AddressDriver account IDs are the same across all chains.
  const availableChain = chainsToQuery.find(
    (chain) =>
      dripsContracts[dbSchemaToChain[chain]] &&
      dripsContracts[dbSchemaToChain[chain]]!.addressDriver,
  );

  if (!availableChain) {
    throw new Error('No available chain with initialized contracts.');
  }

  const { addressDriver } = dripsContracts[dbSchemaToChain[availableChain]]!;

  const accountId = (await addressDriver.calcAccountId(address)).toString();

  return accountId as AddressDriverId;
}

export async function getCrossChainRepoDriverAccountIdByAddress(
  forge: Forge,
  project: string,
  chainsToQuery: DbSchema[],
): Promise<AccountId> {
  // RepoDriver account IDs are the same across all chains.
  const availableChain = chainsToQuery.find(
    (chain) =>
      dripsContracts[dbSchemaToChain[chain]] &&
      dripsContracts[dbSchemaToChain[chain]]!.repoDriver,
  );

  if (!availableChain) {
    throw new Error('No available chain with initialized contracts.');
  }

  const { repoDriver } = dripsContracts[dbSchemaToChain[availableChain]]!;

  const nameAsBytesLike = ethers.toUtf8Bytes(project);

  let forgeAsNum: 0 | 1 | undefined;

  if (forge === 'GitHub') {
    forgeAsNum = 0;
  } else if (forge === 'GitLab') {
    forgeAsNum = 1;
  } else {
    return shouldNeverHappen(`Forge ${forge} not supported.`);
  }

  const accountId = (
    await repoDriver.calcAccountId(forgeAsNum, nameAsBytesLike)
  ).toString();

  return accountId as ProjectId;
}
