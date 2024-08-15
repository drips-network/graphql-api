import dotenv from 'dotenv';
import shouldNeverHappen from '../utils/shouldNeverHappen';

dotenv.config();

function missingEnvVar(name: string): never {
  throw new Error(`Missing ${name} in .env file.`);
}

export default {
  port: (process.env.PORT || 8080) as number,
  network: process.env.NETWORK,
  environment: process.env.ENV ?? 'local',
  infuraApiKey: process.env.INFURA_API_KEY,
  publicApiKeys:
    process.env.PUBLIC_API_KEYS?.split(',') ||
    shouldNeverHappen('PUBLIC_API_KEYS is not set.'),
  dripsApiKey: process.env.DRIPS_API_KEY,
  postgresConnectionString: process.env.POSTGRES_CONNECTION_STRING,
  rpcUrl:
    process.env.RPC_URL ??
    `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
  repoDriverAddress:
    process.env.REPO_DRIVER_ADDRESS ??
    '0x770023d55D09A9C110694827F1a6B32D5c2b373E',
  dripsAddress:
    process.env.DRIPS_ADDRESS ?? '0xd0Dd053392db676D57317CD4fe96Fc2cCf42D0b4',
  pretendAllReposExist:
    (process.env.PRETEND_ALL_REPOS_EXIST as unknown as string) === 'true',
  rateLimitWindowInMinutes: parseInt(
    process.env.RATE_LIMIT_WINDOW_IN_MINUTES ?? '2',
    10,
  ),
  rateLimitMaxRequestsPerWindow: parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS_PER_WINDOW ?? '1000',
    10,
  ),
  maxQueryDepth: parseInt(process.env.MAX_QUERY_DEPTH ?? '10', 10),
  timeoutInSeconds: parseInt(process.env.TIMEOUT_IN_SECONDS ?? '20', 10),
  // TODO: Refactor when we switch to multi-chain API.
  addressDriverAddress:
    process.env.ADDRESS_DRIVER_ADDRESS ||
    missingEnvVar('ADDRESS_DRIVER_ADDRESS'),
  ipfsGatewayUrl: process.env.IPFS_GATEWAY_URL,
  glifToken: process.env.GLIF_TOKEN,
} as const;
