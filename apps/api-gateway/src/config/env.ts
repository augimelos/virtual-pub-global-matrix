import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

// Load .env from monorepo root (2 levels up from apps/api-gateway/src)
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '../../.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(20),
  DATABASE_CONNECTION_TIMEOUT_MS: z.coerce.number().default(10000),
  DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().default(30000),
  REDIS_URL: z.string().min(1),
  REDIS_TLS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform(v => v === 'true'),
  REDIS_KEY_PREFIX: z.string().default('vpub:'),
  PAYPAL_CLIENT_ID: z.string().min(1),
  PAYPAL_CLIENT_SECRET: z.string().min(1),
  PAYPAL_WEBHOOK_ID: z.string().min(1),
  PAYPAL_PLAN_ID_GRID: z.string().min(1),
  PAYPAL_PLAN_ID_PIT_WALL: z.string().min(1),
  PAYPAL_PLAN_ID_PADDOCK: z.string().min(1),
  DISCORD_APPLICATION_ID: z.string().min(17),
  DISCORD_PUBLIC_KEY: z.string().min(1),
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  OPENF1_API_BASE_URL: z.string().url().default('https://api.openf1.org/v1'),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error('\n=== ENVIRONMENT VALIDATION FAILED ===\n');
  for (const issue of result.error.issues) {
    console.error(`  [x] ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\nFix the above issues in your .env file.\n');
  process.exit(1);
}

export const env = Object.freeze(result.data);
export type Env = z.infer<typeof schema>;
