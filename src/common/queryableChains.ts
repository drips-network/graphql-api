import { SupportedChain } from '../generated/graphql';
import appSettings from './appSettings';

const queryableChains: SupportedChain[] = [];

for (const network of Object.keys(SupportedChain)) {
  if (appSettings.rpcUrls[network as SupportedChain]) {
    queryableChains.push(network as SupportedChain);
  }
}

export default queryableChains;
