import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { env } from '../config/env.js';
import {
  verifyWebhookSignature,
  getSubscription,
  resolveTierFromPlanId,
} from '../config/paypalClient.js';
import type { SubscriptionTier } from '../config/paypalClient.js';
import { getDatabase, withRetry } from '../config/supabase.js';
import { sha256Hex } from '../lib/crypto.js';
import { withLock } from '../lib/redlock.js';
import { createChildLogger } from '../lib/logger.js';
import { getRedis } from '../config/redis.js';

const log = createChildLogger('paypal-webhook');
const discordRest = new REST({ version: '10' }).setToken(env.DISCORD_BOT_TOKEN);

const DISCORD_F1_VIP_ROLE = process.env['DISCORD_ROLE_ID_F1_VIP'] ?? '';
const TIER_ROLES: Record<string, string> = {
  grid: process.env['DISCORD_ROLE_ID_GRID'] ?? '',
  pit_wall: process.env['DISCORD_ROLE_ID_PIT_WALL'] ?? '',
  paddock: process.env['DISCORD_ROLE_ID_PADDOCK'] ?? '',
};
const ALL_ROLE_IDS = [DISCORD_F1_VIP_ROLE, ...Object.values(TIER_ROLES)].filter(Boolean);

interface RawBodyRequest extends FastifyRequest {
  rawBody?: Buffer;
}

interface PayPalEvent {
  id: string;
  event_type: string;
  resource: Record<string, unknown>;
}

const HANDLED = new Set([
  'BILLING.SUBSCRIPTION.ACTIVATED',
  'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.EXPIRED',
  'PAYMENT.SALE.COMPLETED',
]);

export async function paypalWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post('/paypal', async (request: RawBodyRequest, reply: FastifyReply) => {
    const rawBody = request.rawBody;
    if (!rawBody || rawBody.length === 0) return reply.status(400).send({ error: 'Empty body' });

    const rawStr = rawBody.toString('utf8');
    const txId = request.headers['paypal-transmission-id'];
    if (!txId) return reply.status(401).send({ error: 'Missing PayPal headers' });

    const valid = await verifyWebhookSignature(
      request.headers as Record<string, string | string[] | undefined>,
      rawStr,
    );
    if (!valid) return reply.status(401).send({ error: 'Invalid signature' });

    let event: PayPalEvent;
    try {
      event = JSON.parse(rawStr) as PayPalEvent;
    } catch {
      return reply.status(400).send({ error: 'Bad JSON' });
    }

    log.info({ eventId: event.id, type: event.event_type }, 'PayPal webhook received');

    if (!HANDLED.has(event.event_type)) return reply.send({ received: true });

    try {
      await withLock(`paypal_${event.id}`, 30_000, async () => {
        const db = getDatabase();
        const existing = await withRetry(
          () =>
            db
              .selectFrom('webhook_events')
              .select('id')
              .where('event_id', '=', event.id)
              .executeTakeFirst(),
          'idempotency-check',
        );
        if (existing) {
          log.info({ eventId: event.id }, 'Already processed');
          return;
        }

        await routeEvent(event);

        await withRetry(
          () =>
            db
              .insertInto('webhook_events')
              .values({
                id: crypto.randomUUID(),
                event_id: event.id,
                event_type: event.event_type,
                processed_at: new Date(),
                idempotency_key: `pp_${event.id}`,
                payload_hash: sha256Hex(rawStr),
              })
              .execute(),
          'record-event',
        );
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('Lock'))
        return reply.send({ received: true });
      log.error({ err, eventId: event.id }, 'Processing error');
      return reply.status(500).send({ error: 'Processing failed' });
    }

    return reply.send({ received: true });
  });
}

async function routeEvent(event: PayPalEvent): Promise<void> {
  const r = event.resource;
  switch (event.event_type) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
      await handleActivated(r);
      break;
    case 'BILLING.SUBSCRIPTION.CANCELLED':
      await handleRevoked(r, 'canceled');
      break;
    case 'BILLING.SUBSCRIPTION.EXPIRED':
      await handleRevoked(r, 'expired');
      break;
    case 'PAYMENT.SALE.COMPLETED':
      await handlePayment(r);
      break;
  }
}

async function handleActivated(resource: Record<string, unknown>): Promise<void> {
  const subId = resource['id'] as string;
  const planId = resource['plan_id'] as string;
  const discordId = resource['custom_id'] as string | undefined;

  if (!discordId) {
    log.error({ subId }, 'No custom_id (discord_id)');
    return;
  }

  const tier = resolveTierFromPlanId(planId);
  if (!tier) {
    log.error({ planId }, 'Unknown plan');
    return;
  }

  const sub = await getSubscription(subId);
  const payerId = sub.subscriber.payer_id;
  const nextBilling = sub.billing_info?.next_billing_time;
  const periodEnd = nextBilling ? new Date(nextBilling) : new Date(Date.now() + 30 * 86400000);

  const db = getDatabase();
  const now = new Date();

  await withRetry(
    () =>
      db.transaction().execute(async trx => {
        await trx
          .insertInto('users')
          .values({
            id: crypto.randomUUID(),
            discord_id: discordId,
            paypal_payer_id: payerId,
            tier,
            created_at: now,
            updated_at: now,
          })
          .onConflict(oc =>
            oc
              .column('discord_id')
              .doUpdateSet({ paypal_payer_id: payerId, tier, updated_at: now }),
          )
          .execute();
        await trx
          .insertInto('subscriptions')
          .values({
            id: crypto.randomUUID(),
            discord_id: discordId,
            paypal_payer_id: payerId,
            paypal_subscription_id: subId,
            status: 'active',
            tier,
            current_period_start: now,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
            created_at: now,
            updated_at: now,
          })
          .onConflict(oc =>
            oc
              .column('paypal_subscription_id')
              .doUpdateSet({
                status: 'active',
                tier,
                current_period_start: now,
                current_period_end: periodEnd,
                updated_at: now,
              }),
          )
          .execute();
      }),
    'activate-tx',
  );

  log.info({ discordId, tier, subId }, 'Subscription activated');
  grantRoles(discordId, tier).catch(e => log.error({ e }, 'Role grant failed'));
  publishStreamEvent(discordId, 'connect', tier).catch(e =>
    log.error({ e }, 'Stream event failed'),
  );
}

async function handleRevoked(
  resource: Record<string, unknown>,
  reason: 'canceled' | 'expired',
): Promise<void> {
  const subId = resource['id'] as string;
  const db = getDatabase();
  const now = new Date();

  const sub = await withRetry(
    () =>
      db
        .selectFrom('subscriptions')
        .select(['discord_id', 'tier'])
        .where('paypal_subscription_id', '=', subId)
        .executeTakeFirst(),
    'lookup-sub',
  );
  if (!sub) {
    log.warn({ subId }, 'Sub not found for revocation');
    return;
  }

  await withRetry(
    () =>
      db.transaction().execute(async trx => {
        await trx
          .updateTable('subscriptions')
          .set({
            status: reason === 'canceled' ? 'canceled' : 'incomplete_expired',
            updated_at: now,
          })
          .where('paypal_subscription_id', '=', subId)
          .execute();
        const other = await trx
          .selectFrom('subscriptions')
          .select('tier')
          .where('discord_id', '=', sub.discord_id)
          .where('paypal_subscription_id', '!=', subId)
          .where('status', 'in', ['active', 'trialing'])
          .executeTakeFirst();
        await trx
          .updateTable('users')
          .set({ tier: other?.tier ?? 'none', updated_at: now })
          .where('discord_id', '=', sub.discord_id)
          .execute();
      }),
    'revoke-tx',
  );

  log.info({ discordId: sub.discord_id, reason }, 'Subscription revoked');

  const user = await withRetry(
    () =>
      db
        .selectFrom('users')
        .select('tier')
        .where('discord_id', '=', sub.discord_id)
        .executeTakeFirst(),
    'check-tier',
  );
  if (!user || user.tier === 'none') {
    revokeAllRoles(sub.discord_id).catch(e => log.error({ e }, 'Revoke failed'));
    publishStreamEvent(sub.discord_id, 'disconnect', null).catch(e =>
      log.error({ e }, 'Stream event failed'),
    );
    sendRevocationDM(sub.discord_id, reason).catch(e => log.error({ e }, 'DM failed'));
  }
}

async function handlePayment(resource: Record<string, unknown>): Promise<void> {
  const saleId = resource['id'] as string;
  const subId = resource['billing_agreement_id'] as string;
  const amount = resource['amount'] as { total: string; currency: string } | undefined;
  const fee = resource['transaction_fee'] as { value: string; currency: string } | undefined;

  if (!subId) return;

  const db = getDatabase();
  const now = new Date();

  const sub = await withRetry(
    () =>
      db
        .selectFrom('subscriptions')
        .select(['discord_id', 'tier'])
        .where('paypal_subscription_id', '=', subId)
        .executeTakeFirst(),
    'lookup-payment',
  );
  if (!sub) return;

  let periodEnd = new Date(now.getTime() + 30 * 86400000);
  try {
    const fresh = await getSubscription(subId);
    if (fresh.billing_info?.next_billing_time)
      periodEnd = new Date(fresh.billing_info.next_billing_time);
  } catch (error) {
    log.warn({ error }, 'Unable to refresh subscription billing date, using fallback period');
  }

  await withRetry(
    () =>
      db.transaction().execute(async trx => {
        await trx
          .updateTable('subscriptions')
          .set({ status: 'active', current_period_end: periodEnd, updated_at: now })
          .where('paypal_subscription_id', '=', subId)
          .execute();
        await trx
          .updateTable('users')
          .set({ tier: sub.tier, updated_at: now })
          .where('discord_id', '=', sub.discord_id)
          .execute();
        await trx
          .insertInto('payment_ledger')
          .values({
            id: crypto.randomUUID(),
            discord_id: sub.discord_id,
            subscription_id: subId,
            transaction_id: saleId,
            amount: parseFloat(amount?.total ?? '0'),
            currency: amount?.currency ?? 'USD',
            transaction_fee: fee ? parseFloat(fee.value) : null,
            fee_currency: fee?.currency ?? null,
            status: 'completed',
            paid_at: now,
            created_at: now,
          })
          .onConflict(oc => oc.column('transaction_id').doNothing())
          .execute();
      }),
    'payment-tx',
  );

  log.info({ discordId: sub.discord_id, saleId, amount: amount?.total }, 'Payment recorded');
}

// Discord Role Management
async function grantRoles(discordId: string, tier: SubscriptionTier): Promise<void> {
  const targetRole = TIER_ROLES[tier];
  const toGrant = [DISCORD_F1_VIP_ROLE, targetRole].filter((role): role is string => Boolean(role));
  if (toGrant.length === 0) return;

  const guilds = (await discordRest.get(Routes.userGuilds())) as Array<{ id: string }>;
  for (const guild of guilds) {
    try {
      const member = (await discordRest.get(Routes.guildMember(guild.id, discordId))) as {
        roles: string[];
      };
      const current = new Set(member.roles);
      for (const roleId of Object.values(TIER_ROLES)) {
        if (roleId && roleId !== targetRole && current.has(roleId))
          await discordRest.delete(Routes.guildMemberRole(guild.id, discordId, roleId));
      }
      for (const roleId of toGrant) {
        if (!current.has(roleId))
          await discordRest.put(Routes.guildMemberRole(guild.id, discordId, roleId));
      }
    } catch (e: unknown) {
      if ((e as { status?: number }).status !== 404)
        log.warn({ guild: guild.id, e }, 'Role grant error');
    }
  }
}

async function revokeAllRoles(discordId: string): Promise<void> {
  if (ALL_ROLE_IDS.length === 0) return;
  const guilds = (await discordRest.get(Routes.userGuilds())) as Array<{ id: string }>;
  for (const guild of guilds) {
    try {
      const member = (await discordRest.get(Routes.guildMember(guild.id, discordId))) as {
        roles: string[];
      };
      for (const roleId of ALL_ROLE_IDS) {
        if (member.roles.includes(roleId))
          await discordRest.delete(Routes.guildMemberRole(guild.id, discordId, roleId));
      }
    } catch (e: unknown) {
      if ((e as { status?: number }).status !== 404)
        log.warn({ guild: guild.id, e }, 'Revoke error');
    }
  }
}

async function publishStreamEvent(
  discordId: string,
  action: 'connect' | 'disconnect',
  tier: SubscriptionTier | null,
): Promise<void> {
  const redis = getRedis();
  const payload = JSON.stringify({
    discord_id: discordId,
    action,
    tier,
    ts: new Date().toISOString(),
  });
  await redis.publish(`vpub:stream:${action}`, payload);
  await redis.publish('vpub:subscription:state_change', JSON.stringify({ discord_id: discordId }));
}

async function sendRevocationDM(discordId: string, reason: string): Promise<void> {
  try {
    const dm = (await discordRest.post(Routes.userChannels(), {
      body: { recipient_id: discordId },
    })) as { id: string };
    await discordRest.post(Routes.channelMessages(dm.id), {
      body: {
        embeds: [
          {
            title: reason === 'canceled' ? 'Subscription Canceled' : 'Subscription Expired',
            description: `Your Virtual Pub access has been revoked. Use \`/subscribe\` to resubscribe.`,
            color: 0xff4444,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });
  } catch (e: unknown) {
    if ((e as { status?: number }).status !== 403) throw e;
  }
}
