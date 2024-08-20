import { SupportedChain } from '../generated/graphql';
import appSettings from './appSettings';

/**
 * Chains that have a defined RPC URL in the `.env` file.
 */
const queryableChains: SupportedChain[] = [];

Object.keys(SupportedChain).forEach((chain) => {
  if (appSettings.rpcConfigs[chain as SupportedChain]) {
    queryableChains.push(chain as SupportedChain);
  }
});

export default queryableChains;
