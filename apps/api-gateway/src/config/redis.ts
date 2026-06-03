import IORedis, { type Redis as RedisType } from "ioredis";
import { env } from "./env.js";
import { createChildLogger } from "../lib/logger.js";

const Redis = IORedis as unknown as new (url: string, opts?: unknown) => RedisType;
const log = createChildLogger("redis");
let redis: RedisType | null = null;

export function getRedis(): RedisType {
  if (redis !== null) return redis;

  redis = new Redis(env.REDIS_URL, {
    keyPrefix: env.REDIS_KEY_PREFIX,
    maxRetriesPerRequest: 3,
    retryStrategy(times: number): number | null {
      if (times > 10) return null;
      return Math.min(times * 200, 5000);
    },
    lazyConnect: false,
    ...(env.REDIS_TLS_ENABLED
      ? { tls: { rejectUnauthorized: env.NODE_ENV === 'production' } }
      : {}),
  });

  redis.on('connect', () => log.info('Redis connected'));
  redis.on('ready', () => log.info('Redis ready'));
  redis.on('error', (err: Error) => log.error({ err }, 'Redis error'));

  return redis;
}

export async function pingRedis(): Promise<boolean> {
  try {
    return (await getRedis().ping()) === 'PONG';
  } catch {
    return false;
  }
}

export async function destroyRedis(): Promise<void> {
  if (redis !== null) {
    await redis.quit().catch(() => redis?.disconnect());
    redis = null;
  }
}
