import pg from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import { env } from './env.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('supabase');

// Database schema types
export interface Database {
  users: {
    id: string;
    discord_id: string;
    paypal_payer_id: string | null;
    tier: 'none' | 'grid' | 'pit_wall' | 'paddock';
    created_at: Date;
    updated_at: Date;
  };
  subscriptions: {
    id: string;
    discord_id: string;
    paypal_payer_id: string;
    paypal_subscription_id: string;
    status:
      | 'active'
      | 'past_due'
      | 'canceled'
      | 'incomplete'
      | 'incomplete_expired'
      | 'trialing'
      | 'unpaid'
      | 'paused';
    tier: 'grid' | 'pit_wall' | 'paddock';
    current_period_start: Date;
    current_period_end: Date;
    cancel_at_period_end: boolean;
    created_at: Date;
    updated_at: Date;
  };
  webhook_events: {
    id: string;
    event_id: string;
    event_type: string;
    processed_at: Date;
    idempotency_key: string;
    payload_hash: string;
  };
  payment_ledger: {
    id: string;
    discord_id: string;
    subscription_id: string;
    transaction_id: string;
    amount: number;
    currency: string;
    transaction_fee: number | null;
    fee_currency: string | null;
    status: string;
    paid_at: Date;
    created_at: Date;
  };
}

let pool: pg.Pool | null = null;
let db: Kysely<Database> | null = null;

export function getDatabase(): Kysely<Database> {
  if (db !== null) return db;

  pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    min: env.DATABASE_POOL_MIN,
    max: env.DATABASE_POOL_MAX,
    connectionTimeoutMillis: env.DATABASE_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: env.DATABASE_IDLE_TIMEOUT_MS,
    application_name: 'virtual-pub-api-gateway',
  });

  pool.on('error', (err: Error) => log.error({ err }, 'Pool error'));

  db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  log.info({ min: env.DATABASE_POOL_MIN, max: env.DATABASE_POOL_MAX }, 'Database pool initialized');
  return db;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  name: string,
  maxRetries = 3,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = Math.min(100 * Math.pow(2, attempt), 5000);
        log.warn({ name, attempt: attempt + 1, delay }, 'Retrying DB operation');
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

export async function pingDatabase(): Promise<boolean> {
  try {
    const database = getDatabase();
    await database.selectFrom('users').select('id').limit(1).execute();
    return true;
  } catch {
    return false;
  }
}

export async function destroyDatabase(): Promise<void> {
  if (db !== null) {
    await db.destroy();
    db = null;
    pool = null;
  }
}
