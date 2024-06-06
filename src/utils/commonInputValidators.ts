import queryableChains from '../common/queryableChains';
import { SupportedChain } from '../generated/graphql';

// eslint-disable-next-line import/prefer-default-export
export function validateChainsQueryArg(chains: SupportedChain[]) {
  chains.forEach((chain) => {
    if (!(chain in SupportedChain)) {
      throw new Error(`Chain '${chain}' is not supported.`);
    }

    if (!queryableChains.includes(chain)) {
      throw new Error(`Chain '${chain}' is missing RPC URL in the .env file.`);
    }
  });
}
