import dotenv from 'dotenv';
import { z } from 'zod';
import { SupportedChain } from '../generated/graphql';

const DEFAULT_PROJECT_SUCCESS_TTL_SECONDS = 6 * 60 * 60; // 6 hours
const DEFAULT_PROJECT_ERROR_TTL_SECONDS = 30 * 60; // 30 minutes
const DEFAULT_LINKED_IDENTITY_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const DEFAULT_CACHE_TTL_JITTER_RATIO = 0.1;

dotenv.config();

function missingEnvVar(name: string): never {
  throw new Error(`Missing ${name} in .env file.`);
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

function parseRatio(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? '');
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
    return parsed;
  }
  return fallback;
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
  orcidApiToken: process.env.ORCID_API_TOKEN,
  cacheSettings: {
    projectSuccessTtlSeconds: parsePositiveInt(
      process.env.CACHE_PROJECT_SUCCESS_TTL_SECONDS,
      DEFAULT_PROJECT_SUCCESS_TTL_SECONDS,
    ),
    projectErrorTtlSeconds: parsePositiveInt(
      process.env.CACHE_PROJECT_ERROR_TTL_SECONDS,
      DEFAULT_PROJECT_ERROR_TTL_SECONDS,
    ),
    linkedIdentityTtlSeconds: parsePositiveInt(
      process.env.CACHE_LINKED_IDENTITY_TTL_SECONDS,
      DEFAULT_LINKED_IDENTITY_TTL_SECONDS,
    ),
    ttlJitterRatio: parseRatio(
      process.env.CACHE_TTL_JITTER_RATIO ??
        process.env.CACHE_PROJECT_TTL_JITTER_RATIO ??
        process.env.CACHE_LINKED_IDENTITY_TTL_JITTER_RATIO,
      DEFAULT_CACHE_TTL_JITTER_RATIO,
    ),
  },
};
