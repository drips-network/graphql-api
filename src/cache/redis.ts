/* eslint-disable no-console */
import { createClient, type RedisClientType } from 'redis';
import appSettings from '../common/appSettings';

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (!appSettings.redisUrl) {
    return null;
  }

  if (!redisClient || !redisClient.isReady) {
    try {
      redisClient = createClient({
        url: appSettings.redisUrl,
        socket: {
          reconnectStrategy: 1000, // Reconnect after 1 second
        },
      });

      redisClient.on('error', (err) => {
        console.error('Redis client error:', err);
      });

      await redisClient.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      redisClient = null;
      return null;
    }
  }

  return redisClient;
}

export async function setCache(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  try {
    await client.setEx(key, ttlSeconds, value);
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

type CacheLookupResult = {
  value: string | null;
  ttlSeconds: number | null;
};

export async function getCache(key: string): Promise<CacheLookupResult> {
  const client = await getRedisClient();
  if (!client)
    return {
      value: null,
      ttlSeconds: null,
    };

  try {
    const [value, ttlSeconds] = await Promise.all([
      client.get(key),
      client.ttl(key),
    ]);

    const stringValue = value ?? null;
    const ttl =
      Number.isFinite(ttlSeconds) && (ttlSeconds as number) >= 0
        ? (ttlSeconds as number)
        : null;

    if (stringValue !== null) {
      console.log('Cache hit.', { key, ttlSeconds: ttl });
    } else {
      console.log('Cache miss.', { key });
    }

    return {
      value: stringValue,
      ttlSeconds: ttl,
    };
  } catch (error) {
    console.error('Redis get error:', error);
    return {
      value: null,
      ttlSeconds: null,
    };
  }
}

export function computeTtlWithJitter(
  baseTtlSeconds: number,
  jitterRatio: number,
): number {
  if (!Number.isFinite(baseTtlSeconds) || baseTtlSeconds <= 0) {
    throw new Error('baseTtlSeconds must be a positive number.');
  }
  if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 1) {
    throw new Error('jitterRatio must be between 0 and 1.');
  }

  if (jitterRatio === 0) {
    return Math.max(1, Math.round(baseTtlSeconds));
  }

  const jitterSpan = baseTtlSeconds * jitterRatio;
  const minTtl = Math.max(1, baseTtlSeconds - jitterSpan);
  const maxTtl = baseTtlSeconds + jitterSpan;
  const selected = Math.round(minTtl + Math.random() * (maxTtl - minTtl));
  return selected > 0 ? selected : 1;
}

export async function setCacheWithJitter(
  key: string,
  value: string,
  baseTtlSeconds: number,
  jitterRatio: number,
): Promise<void> {
  const ttlSeconds = computeTtlWithJitter(baseTtlSeconds, jitterRatio);
  await setCache(key, value, ttlSeconds);
}
