import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  name: 'virtual-pub-api',
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        }
      : undefined,
  base: { service: 'api-gateway', env: env.NODE_ENV },
});

export function createChildLogger(module: string): pino.Logger {
  return logger.child({ module });
}
