import {
  FetchRequest,
  JsonRpcProvider,
  WebSocketProvider,
  ethers,
} from 'ethers';
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
  Forge,
  ProjectId,
} from './types';
import queryableChains from './queryableChains';

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
    dripsAddress: '0x0B71C2a08d27E86d3841A6772332DEde0bc8DCa5',
    addressDriverAddress: '0xEFcd912a5a67C3a7Cc70a2Fb9aa17781bf1cE68F',
    repoDriverAddress: '0xf3aE6ADDeEE195e91380F5F9Ce73698460BAdf79',
  },
};

const { rpcConfigs } = appSettings;

const providers: {
  [network in SupportedChain]?: JsonRpcProvider | WebSocketProvider;
} = {};

function createAuthFetchRequest(rpcUrl: string, token: string): FetchRequest {
  const fetchRequest = new FetchRequest(rpcUrl);
  fetchRequest.method = 'POST';
  fetchRequest.setHeader('Content-Type', 'application/json');
  fetchRequest.setHeader('Authorization', `Bearer ${token}`);
  return fetchRequest;
}

Object.values(SupportedChain).forEach((network) => {
  const rpcConfig = rpcConfigs[network];

  if (rpcConfig?.url) {
    const rpcUrl = rpcConfig.url;

    let provider: JsonRpcProvider | WebSocketProvider | null = null;

    if (rpcUrl.startsWith('http')) {
      provider = rpcConfig?.accessToken
        ? new JsonRpcProvider(
            createAuthFetchRequest(rpcUrl, rpcConfig.accessToken),
          )
        : new JsonRpcProvider(rpcUrl);
    } else if (rpcUrl.startsWith('wss')) {
      provider = new WebSocketProvider(rpcUrl);
    } else {
      shouldNeverHappen(`Invalid RPC URL: ${rpcUrl}`);
    }

    providers[network] = provider;
  }
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
): Promise<AddressDriverId> {
  // AddressDriver account IDs are the same across all chains.
  const availableChain = queryableChains.find(
    (chain) => dripsContracts[chain] && dripsContracts[chain]!.addressDriver,
  );

  if (!availableChain) {
    throw new Error('No available chain with initialized contracts.');
  }

  const { addressDriver } = dripsContracts[availableChain]!;

  const accountId = (await addressDriver.calcAccountId(address)).toString();

  return accountId as AddressDriverId;
}

export async function getCrossChainRepoDriverAccountIdByAddress(
  forge: Forge,
  project: string,
): Promise<AccountId> {
  // RepoDriver account IDs are the same across all chains.
  const availableChain = queryableChains.find(
    (chain) => dripsContracts[chain] && dripsContracts[chain]!.repoDriver,
  );

  if (!availableChain) {
    throw new Error('No available chain with initialized contracts.');
  }

  const { repoDriver } = dripsContracts[availableChain]!;

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
