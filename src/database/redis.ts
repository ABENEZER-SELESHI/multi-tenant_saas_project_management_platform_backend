import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let redis: Redis | null = null;

export const getRedis = (): Redis | null => {
  if (!env.REDIS_URL) return null;
  if (!redis) {
    redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });
    redis.on('error', (err: Error) => logger.error('Redis error', { error: err.message }));
    redis.on('connect', () => logger.info('Redis connected'));
  }
  return redis;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    redis = null;
  }
};

export const pingRedis = async (): Promise<boolean> => {
  const client = getRedis();
  if (!client) return false;
  try {
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
};
