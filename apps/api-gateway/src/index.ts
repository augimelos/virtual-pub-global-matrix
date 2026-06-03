import 'dotenv/config';
import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySensible from '@fastify/sensible';
import { env } from './config/env.js';

interface RawBodyRequest extends FastifyRequest {
  rawBody?: Buffer;
}
import { logger, createChildLogger } from './lib/logger.js';
import { destroyDatabase } from './config/supabase.js';
import { destroyRedis } from './config/redis.js';
import { destroyRedlock } from './lib/redlock.js';
import { healthRoutes } from './routes/health.js';

const log = createChildLogger('bootstrap');

/**
 * FIX: Fastify v5 requires logger to be a configuration object.
 * We pass our custom instance inside the 'instance' property.
 */
const app = Fastify({
  loggerInstance: logger,
  trustProxy: true,
  bodyLimit: 1_048_576,
  genReqId: req => (req.headers['x-request-id'] as string) ?? crypto.randomUUID(),
});

// Raw body parser
app.addContentTypeParser(
  'application/json',
  { parseAs: 'buffer' },
  (req: RawBodyRequest, body: Buffer, done) => {
    req.rawBody = body;
    try {
      done(null, JSON.parse(body.toString('utf8')));
    } catch (e) {
      done(e instanceof Error ? e : new Error(String(e)), undefined);
    }
  },
);

async function start(): Promise<void> {
  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyCors, {
    origin: [/discordsays\.com$/, /localhost/],
    credentials: true,
  });
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: req => req.url.startsWith('/webhooks/'),
  });
  await app.register(fastifySensible);
  await app.register(healthRoutes);

  try {
    const { paypalWebhookRoutes } = await import('./webhooks/paypalWebhookHandler.js');
    await app.register(paypalWebhookRoutes, { prefix: '/webhooks' });
    log.info('PayPal webhook routes registered at /webhooks/paypal');
  } catch (err) {
    log.warn({ err }, 'PayPal webhook handler not ready');
  }

  app.addHook('onClose', async () => {
    await destroyRedlock();
    await destroyRedis();
    await destroyDatabase();
  });

  app.setErrorHandler((error: unknown, req: FastifyRequest, reply: FastifyReply) => {
    const err = error as { statusCode?: number; name?: string; message?: string };
    const status = err.statusCode ?? 500;
    if (status >= 500) log.error({ err: error, url: req.url }, 'Server error');
    reply.status(status).send({
      statusCode: status,
      error: err.name ?? 'Error',
      message:
        env.NODE_ENV === 'production' && status >= 500
          ? 'Internal error'
          : (err.message ?? String(error)),
    });
  });

  const host = env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  await app.listen({ port: env.PORT, host });
  log.info({ port: env.PORT, host, env: env.NODE_ENV }, 'Virtual Pub API Gateway ONLINE');
}

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, 'Shutting down...');
  setTimeout(() => process.exit(1), 15_000).unref();
  try {
    await app.close();
    process.exit(0);
  } catch {
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', err => {
  log.fatal({ err }, 'Uncaught exception');
  shutdown('uncaughtException');
});
process.on('unhandledRejection', reason => {
  log.fatal({ err: reason }, 'Unhandled rejection');
  shutdown('unhandledRejection');
});

start();
export { app };
