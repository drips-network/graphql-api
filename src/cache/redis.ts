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
        redisClient = null; // Reset on error to trigger reconnection
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

export async function getCache(key: string): Promise<string | null> {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    return await client.get(key);
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}
