import dotenv from 'dotenv';

dotenv.config();

function missingEnvVarError(name: string): never {
  throw new Error(`Missing ${name} in .env file.`);
}

export default {
  port: (process.env.PORT || 8080) as number,
  network: process.env.NETWORK || missingEnvVarError('NETWORK'),
  publicApiKeys:
    process.env.PUBLIC_API_KEYS?.split(',') ||
    missingEnvVarError('PUBLIC_API_KEYS'),
  dripsApiKey: process.env.DRIPS_API_KEY,
  postgresConnectionString:
    process.env.POSTGRES_CONNECTION_STRING ||
    missingEnvVarError('POSTGRES_CONNECTION_STRING'),
  addressDriverAddress:
    process.env.ADDRESS_DRIVER_ADDRESS ||
    missingEnvVarError('ADDRESS_DRIVER_ADDRESS'),
  dripsAddress:
    process.env.DRIPS_ADDRESS || missingEnvVarError('DRIPS_ADDRESS'),
  repoDriverAddress:
    process.env.REPO_DRIVER_ADDRESS ||
    missingEnvVarError('REPO_DRIVER_ADDRESS'),

  rpcUrl: process.env.RPC_URL || missingEnvVarError('RPC_URL'),
  rpcAccessToken: process.env.RPC_ACCESS_TOKEN,
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
  ipfsGatewayUrl:
    process.env.IPFS_GATEWAY_URL || 'https://drips.mypinata.cloud',
} as const;
