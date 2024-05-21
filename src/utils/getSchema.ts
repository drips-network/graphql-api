import { SupportedChain } from '../generated/graphql';

// TODO: This should be removed once multi-chain support is implemented. For we return sepolia for anything that still relies on the "network".
export default function getSchema(): SupportedChain {
  return SupportedChain.sepolia;
}
