import { DB_SCHEMAS } from '../common/constants';
import queryableChains from '../common/queryableChains';
import type { SupportedChain } from '../generated/graphql';

// eslint-disable-next-line import/prefer-default-export
export function validateChainsQueryArg(chains: SupportedChain[]) {
  chains.forEach((chain) => {
    if (!(chain in DB_SCHEMAS)) {
      throw new Error(`Chain '${chain}' is not supported.`);
    }

    if (!queryableChains.includes(chain)) {
      throw new Error(`Chain '${chain}' is missing RPC URL in the .env file.`);
    }
  });
}
