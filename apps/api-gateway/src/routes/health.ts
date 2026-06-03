import type { FastifyInstance } from 'fastify';
import { pingDatabase } from '../config/supabase.js';
import { pingRedis } from '../config/redis.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/healthz', async (_req, reply) => {
    return reply.send({ status: 'alive', uptime: process.uptime() });
  });

  app.get('/readyz', async (_req, reply) => {
    const [dbOk, redisOk] = await Promise.all([pingDatabase(), pingRedis()]);
    const ready = dbOk && redisOk;
    return reply.status(ready ? 200 : 503).send({
      status: ready ? 'ready' : 'not_ready',
      checks: { database: dbOk, redis: redisOk },
    });
  });
}
