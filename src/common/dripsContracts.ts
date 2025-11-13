import { FetchRequest, JsonRpcProvider, ZeroAddress, ethers } from 'ethers';
import appSettings from './appSettings';
import type {
  AddressDriver,
  Drips,
  RepoDriver,
  RepoSubAccountDriver,
} from '../generated/contracts';
import {
  AddressDriver__factory,
  Drips__factory,
  RepoDriver__factory,
  RepoSubAccountDriver__factory,
} from '../generated/contracts';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import { SupportedChain } from '../generated/graphql';
import type { Address, AddressDriverId, DbSchema, RepoDriverId } from './types';
import { dbSchemaToChain } from '../utils/chainSchemaMappings';

const chainConfigs: Record<
  SupportedChain,
  {
    dripsAddress: string;
    addressDriverAddress: string;
    repoDriverAddress: string;
    repoSubAccountDriverAddress: string;
  }
> = {
  MAINNET: {
    dripsAddress: '0xd0Dd053392db676D57317CD4fe96Fc2cCf42D0b4',
    addressDriverAddress: '0x1455d9bD6B98f95dd8FEB2b3D60ed825fcef0610',
    repoDriverAddress: '0x770023d55D09A9C110694827F1a6B32D5c2b373E',
    repoSubAccountDriverAddress: '0xc219395880fa72e3ad9180b8878e0d39d144130b',
  },
  SEPOLIA: {
    dripsAddress: '0x74A32a38D945b9527524900429b083547DeB9bF4',
    addressDriverAddress: '0x70E1E1437AeFe8024B6780C94490662b45C3B567',
    repoDriverAddress: '0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B',
    repoSubAccountDriverAddress: '0x317400fd9dfdad78d53a34455d89beb8f03f90ee',
  },
  OPTIMISM_SEPOLIA: {
    dripsAddress: '0xa15f3ebCf1e9c83442ddFa92A2A44A3d1643E406',
    addressDriverAddress: '0xA2B5b1ACaF088d6AF2e289EF54DbF48058429eA8',
    repoDriverAddress: '0x808e5C413BB085284D18e17BDF9682A66A0097D5',
    repoSubAccountDriverAddress: '0xe077e0D50fB60b900467F4a44DF7b49deB41097d',
  },
  POLYGON_AMOY: {
    dripsAddress: '0xeebCd570e50fa31bcf6eF10f989429C87C3A6981',
    addressDriverAddress: '0x004310a6d47893Dd6e443cbE471c24aDA1e6c619',
    repoDriverAddress: '0x54372850Db72915Fd9C5EC745683EB607b4a8642',
    repoSubAccountDriverAddress: ZeroAddress,
  },
  BASE_SEPOLIA: {
    dripsAddress: '0xeebCd570e50fa31bcf6eF10f989429C87C3A6981',
    addressDriverAddress: '0x004310a6d47893Dd6e443cbE471c24aDA1e6c619',
    repoDriverAddress: '0x54372850Db72915Fd9C5EC745683EB607b4a8642',
    repoSubAccountDriverAddress: ZeroAddress,
  },
  FILECOIN: {
    dripsAddress: '0xd320F59F109c618b19707ea5C5F068020eA333B3',
    addressDriverAddress: '0x04693D13826a37dDdF973Be4275546Ad978cb9EE',
    repoDriverAddress: '0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257',
    repoSubAccountDriverAddress: '0x925a69f6d07ee4c753df139bcc2a946e1d1ee92a',
  },
  METIS: {
    dripsAddress: '0xd320F59F109c618b19707ea5C5F068020eA333B3',
    addressDriverAddress: '0x04693D13826a37dDdF973Be4275546Ad978cb9EE',
    repoDriverAddress: '0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257',
    repoSubAccountDriverAddress: '0x925a69f6d07ee4c753df139bcc2a946e1d1ee92a',
  },
  LOCALTESTNET: {
    dripsAddress: '0x7CBbD3FdF9E5eb359E6D9B12848c5Faa81629944',
    addressDriverAddress: '0x1707De7b41A3915F990A663d27AD3a952D50151d',
    repoDriverAddress: '0x971e08fc533d2A5f228c7944E511611dA3B56B24',
    repoSubAccountDriverAddress: '0xB8743C2bB8DF7399273aa7EE4cE8d4109Bec327F',
  },
  OPTIMISM: {
    dripsAddress: '0xd320F59F109c618b19707ea5C5F068020eA333B3',
    addressDriverAddress: '0x04693D13826a37dDdF973Be4275546Ad978cb9EE',
    repoDriverAddress: '0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257',
    repoSubAccountDriverAddress: '0x925a69f6d07ee4c753df139bcc2a946e1d1ee92a',
  },
  ZKSYNC_ERA_SEPOLIA: {
    dripsAddress: '0xd320F59F109c618b19707ea5C5F068020eA333B3',
    addressDriverAddress: '0x0557b6BA791A24df0Fa6167E1Dc304F403ee777A',
    repoDriverAddress: '0x8bDC23877A23Ce59fEF1712A1486810d9A6E2B94',
    repoSubAccountDriverAddress: ZeroAddress,
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
    repoSubAccountDriver: RepoSubAccountDriver;
  };
} = {};

Object.entries(providers).forEach(([network, provider]) => {
  if (!chainConfigs[network as SupportedChain]) {
    throw new Error(`Missing chain config for network '${network}'.`);
  }

  const {
    addressDriverAddress,
    repoDriverAddress,
    dripsAddress,
    repoSubAccountDriverAddress,
  } = chainConfigs[network as SupportedChain];

  const addressDriver = AddressDriver__factory.connect(
    addressDriverAddress,
    provider,
  );
  const repoDriver = RepoDriver__factory.connect(repoDriverAddress, provider);

  const repoSubAccountDriver = RepoSubAccountDriver__factory.connect(
    repoSubAccountDriverAddress,
    provider,
  );

  const drips = Drips__factory.connect(dripsAddress, provider);

  dripsContracts[network as SupportedChain] = {
    drips,
    addressDriver,
    repoDriver,
    repoSubAccountDriver,
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
  forge: 'github' | 'gitlab',
  projectName: string,
  chainsToQuery: DbSchema[],
): Promise<RepoDriverId> {
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

  const nameAsBytesLike = ethers.toUtf8Bytes(projectName);

  let forgeAsNum: 0 | 1;

  if (forge === 'github') {
    forgeAsNum = 0;
  } else if (forge === 'gitlab') {
    forgeAsNum = 1;
  } else {
    return shouldNeverHappen(`Forge ${forge} not supported.`);
  }

  const accountId = (
    await repoDriver.calcAccountId(forgeAsNum, nameAsBytesLike)
  ).toString();

  return accountId as RepoDriverId;
}

export async function getCrossChainOrcidAccountIdByOrcidId(
  orcidId: string,
  chainsToQuery: DbSchema[],
): Promise<RepoDriverId> {
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

  const nameAsBytesLike = ethers.toUtf8Bytes(orcidId);

  // ORCID forge is always 2
  const forgeAsNum = 2;

  const accountId = (
    await repoDriver.calcAccountId(forgeAsNum, nameAsBytesLike)
  ).toString();

  return accountId as RepoDriverId;
}
