import { JsonRpcProvider, WebSocketProvider, ethers } from 'ethers';
import appSettings from './appSettings';
import type { AddressDriver, RepoDriver } from '../generated/contracts';
import {
  AddressDriver__factory,
  RepoDriver__factory,
} from '../generated/contracts';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import { SupportedChain } from '../generated/graphql';
import type {
  AccountId,
  Address,
  AddressDriverId,
  Forge,
  ProjectId,
} from './types';
import queryableChains from './queryableChains';

const chainConfigs: Record<
  SupportedChain,
  {
    addressDriverAddress: string;
    repoDriverAddress: string;
  }
> = {
  mainnet: {
    addressDriverAddress: '0x1455d9bD6B98f95dd8FEB2b3D60ed825fcef0610',
    repoDriverAddress: '0x770023d55D09A9C110694827F1a6B32D5c2b373E',
  },
  sepolia: {
    addressDriverAddress: '0x70E1E1437AeFe8024B6780C94490662b45C3B567',
    repoDriverAddress: '0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B',
  },
  optimism_sepolia: {
    addressDriverAddress: '0x70E1E1437AeFe8024B6780C94490662b45C3B567',
    repoDriverAddress: '0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B',
  },
  polygon_amoy: {
    addressDriverAddress: '0x004310a6d47893Dd6e443cbE471c24aDA1e6c619',
    repoDriverAddress: '0x54372850Db72915Fd9C5EC745683EB607b4a8642',
  },
};

const { rpcUrls } = appSettings;

const providers: {
  [network in SupportedChain]?: JsonRpcProvider | WebSocketProvider;
} = {};

Object.values(SupportedChain).forEach((network) => {
  const rpcUrl = rpcUrls[network];
  if (rpcUrl) {
    // eslint-disable-next-line no-nested-ternary
    const provider = rpcUrl.startsWith('http')
      ? new JsonRpcProvider(rpcUrl)
      : rpcUrl.startsWith('wss')
      ? new WebSocketProvider(rpcUrl)
      : shouldNeverHappen(`Invalid RPC URL: ${rpcUrl}`);
    providers[network] = provider;
  }
});

const dripsContracts: {
  [network in SupportedChain]?: {
    addressDriver: AddressDriver;
    repoDriver: RepoDriver;
  };
} = {};

Object.entries(providers).forEach(([network, provider]) => {
  if (!chainConfigs[network as SupportedChain]) {
    throw new Error(`Missing chain config for network '${network}'.`);
  }

  const { addressDriverAddress, repoDriverAddress } =
    chainConfigs[network as SupportedChain];

  const addressDriver = AddressDriver__factory.connect(
    addressDriverAddress,
    provider,
  );
  const repoDriver = RepoDriver__factory.connect(repoDriverAddress, provider);

  dripsContracts[network as SupportedChain] = {
    addressDriver,
    repoDriver,
  };
});

export default dripsContracts;

export async function getCrossChainAddressDriverAccountIdByAddress(
  address: Address,
): Promise<AddressDriverId> {
  // AddressDriver account IDs are the same across all chains.
  const { addressDriver } = dripsContracts[queryableChains[0]]!;

  const accountId = (await addressDriver.calcAccountId(address)).toString();

  return accountId as AddressDriverId;
}

export async function getCrossChainRepoDriverAccountIdByAddress(
  forge: Forge,
  project: string,
): Promise<AccountId> {
  // RepoDriver account IDs are the same across all chains.
  const { repoDriver } = dripsContracts[queryableChains[0]]!;

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
