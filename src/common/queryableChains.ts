import { SupportedChain } from '../generated/graphql';
import appSettings from './appSettings';

/**
 * Chains that have a defined RPC URL in the `.env` file.
 */
const queryableChains: SupportedChain[] = [];

Object.keys(SupportedChain).forEach((chain) => {
  if (appSettings.rpcConfig[chain as SupportedChain]?.url) {
    queryableChains.push(chain as SupportedChain);
  }
});

export default queryableChains;
