import appSettings from './appSettings';
import { SUPPORTED_CHAINS } from './constants';
import type { SupportedChain } from './types';

const { rpcUrls } = appSettings;

const queryableChains: SupportedChain[] = [];

SUPPORTED_CHAINS.forEach((network) => {
  if (rpcUrls[network]) {
    queryableChains.push(network);
  }
});

export default queryableChains;
