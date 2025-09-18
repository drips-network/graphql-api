import dotenv from 'dotenv';
import { z } from 'zod';
import { SupportedChain } from '../generated/graphql';

dotenv.config();

function missingEnvVar(name: string): never {
  throw new Error(`Missing ${name} in .env file.`);
}

const RpcConfigSchema = z.record(
  z.nativeEnum(SupportedChain),
  z
    .object({
      url: z.string().url(),
      accessToken: z.string().optional(),
    })
    .optional(),
);

export default {
  port: (process.env.PORT || 8080) as number,
  rpcConfig: process.env.RPC_CONFIG
    ? RpcConfigSchema.parse(JSON.parse(process.env.RPC_CONFIG))
    : missingEnvVar('RPC_CONFIG'),
  publicApiKeys: process.env.PUBLIC_API_KEYS?.split(',') || [],
  dripsApiKey: process.env.DRIPS_API_KEY,
  postgresConnectionString: process.env.POSTGRES_CONNECTION_STRING,
  pretendAllReposExist:
    (process.env.PRETEND_ALL_REPOS_EXIST as unknown as string) === 'true' ||
    false,
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
  ipfsGatewayUrl:
    process.env.IPFS_GATEWAY_URL || 'https://drips.mypinata.cloud',
  githubToken: process.env.GITHUB_TOKEN,
  redisUrl: process.env.REDIS_URL,
  orcidApiEndpoint:
    process.env.ORCID_API_ENDPOINT || 'https://pub.orcid.org/v3.0',
};
