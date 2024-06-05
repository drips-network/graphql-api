import queryableChains from '../common/queryableChains';
import { SupportedChain } from '../generated/graphql';
import assert from './assert';

// eslint-disable-next-line import/prefer-default-export
export function validateChainsInput(chains: SupportedChain[]) {
  chains.forEach((chain) => {
    assert(chain in SupportedChain);

    if (!queryableChains.includes(chain)) {
      throw new Error(`Chain '${chain}' is missing RPC URL in the .env file.`);
    }
  });
}
