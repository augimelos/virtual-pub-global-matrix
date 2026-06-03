import Redlock, { type Lock } from 'redlock';
import { getRedis } from '../config/redis.js';
import { createChildLogger } from './logger.js';

const log = createChildLogger('redlock');
let redlock: Redlock | null = null;

export function getRedlock(): Redlock {
  if (redlock !== null) return redlock;
  redlock = new Redlock([getRedis()], {
    driftFactor: 0.01,
    retryCount: 3,
    retryDelay: 200,
    retryJitter: 100,
    automaticExtensionThreshold: 500,
  });
  redlock.on('error', (err: Error) => log.warn({ err }, 'Redlock contention (non-fatal)'));
  return redlock;
}

export async function withLock<T>(
  resource: string,
  ttlMs: number,
  operation: (lock: Lock) => Promise<T>,
): Promise<T> {
  const lock = await getRedlock().acquire([`lock:${resource}`], ttlMs);
  try {
    return await operation(lock);
  } finally {
    await lock.release().catch(() => {});
  }
}

export async function destroyRedlock(): Promise<void> {
  if (redlock !== null) {
    await redlock.quit().catch(() => {});
    redlock = null;
  }
}
