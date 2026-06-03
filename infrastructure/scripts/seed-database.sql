-- VIRTUAL PUB DATABASE SCHEMA
-- Run in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discord_id TEXT NOT NULL UNIQUE,
  paypal_payer_id TEXT,
  tier TEXT NOT NULL DEFAULT 'none' CHECK (tier IN ('none','grid','pit_wall','paddock')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_paypal ON users (paypal_payer_id) WHERE paypal_payer_id IS NOT NULL;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  paypal_payer_id TEXT NOT NULL,
  paypal_subscription_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN ('active','past_due','canceled','incomplete','incomplete_expired','trialing','unpaid','paused')),
  tier TEXT NOT NULL DEFAULT 'grid' CHECK (tier IN ('grid','pit_wall','paddock')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subs_discord ON subscriptions (discord_id);
CREATE INDEX IF NOT EXISTS idx_subs_active ON subscriptions (discord_id, status) WHERE status IN ('active','trialing');

-- Webhook events (idempotency)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL
);

-- Payment ledger
CREATE TABLE IF NOT EXISTS payment_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discord_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  transaction_fee DECIMAL(10,2),
  fee_currency TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  paid_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS '
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
' LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated ON users;
CREATE TRIGGER users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS subs_updated ON subscriptions;
CREATE TRIGGER subs_updated BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_ledger ENABLE ROW LEVEL SECURITY;

-- Verify
DO '
BEGIN RAISE NOTICE ''All tables created successfully''; END;
';