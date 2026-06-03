import { env } from './env.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('paypal-client');

export type SubscriptionTier = 'grid' | 'pit_wall' | 'paddock';

const isSandbox = env.NODE_ENV !== 'production';
const API_BASE = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

// Plan <-> Tier mapping
const PLAN_TO_TIER = new Map<string, SubscriptionTier>([
  [env.PAYPAL_PLAN_ID_GRID, 'grid'],
  [env.PAYPAL_PLAN_ID_PIT_WALL, 'pit_wall'],
  [env.PAYPAL_PLAN_ID_PADDOCK, 'paddock'],
]);

export function resolveTierFromPlanId(planId: string): SubscriptionTier | null {
  return PLAN_TO_TIER.get(planId) ?? null;
}

// OAuth2 Token Cache
interface CachedToken {
  accessToken: string;
  expiresAt: number;
}
let cachedToken: CachedToken | null = null;
let refreshPromise: Promise<CachedToken> | null = null;

function generateBasicAuth(): string {
  return `Basic ${Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`;
}

async function requestToken(): Promise<CachedToken> {
  log.debug('Requesting PayPal access token');
  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: generateBasicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal token error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  const token = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 300_000,
  };
  log.info({ expiresIn: data.expires_in }, 'PayPal token acquired');
  return token;
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken !== null && Date.now() < cachedToken.expiresAt) return cachedToken.accessToken;
  if (refreshPromise !== null) return (await refreshPromise).accessToken;
  refreshPromise = requestToken();
  try {
    cachedToken = await refreshPromise;
    return cachedToken.accessToken;
  } finally {
    refreshPromise = null;
  }
}

export async function paypalRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    cachedToken = null;
    throw new Error('PayPal 401 â€” token expired');
  }
  if (!res.ok) throw new Error(`PayPal ${res.status}: ${await res.text()}`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface PayPalSubscription {
  id: string;
  plan_id: string;
  status: string;
  subscriber: { email_address: string; payer_id: string };
  billing_info: { next_billing_time?: string };
  custom_id?: string;
}

export async function getSubscription(id: string): Promise<PayPalSubscription> {
  return paypalRequest<PayPalSubscription>('GET', `/v1/billing/subscriptions/${id}`);
}

interface VerifyResponse {
  verification_status: 'SUCCESS' | 'FAILURE';
}

export async function verifyWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string,
): Promise<boolean> {
  const h = (name: string): string => {
    const v = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
  };
  const transmissionId = h('paypal-transmission-id');
  const transmissionTime = h('paypal-transmission-time');
  const transmissionSig = h('paypal-transmission-sig');
  const authAlgo = h('paypal-auth-algo');
  const certUrl = h('paypal-cert-url');

  if (!transmissionId || !transmissionTime || !transmissionSig || !authAlgo || !certUrl) {
    log.warn('Missing PayPal verification headers');
    return false;
  }

  // SSRF guard
  try {
    const url = new URL(certUrl);
    if (
      ![
        'api.paypal.com',
        'api.sandbox.paypal.com',
        'api-m.paypal.com',
        'api-m.sandbox.paypal.com',
      ].includes(url.hostname)
    )
      return false;
    if (url.protocol !== 'https:') return false;
  } catch {
    return false;
  }

  try {
    const result = await paypalRequest<VerifyResponse>(
      'POST',
      '/v1/notifications/verify-webhook-signature',
      {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: env.PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(rawBody),
      },
    );
    return result.verification_status === 'SUCCESS';
  } catch (err) {
    log.error({ err }, 'Webhook verification failed');
    return false;
  }
}

log.info({ apiBase: API_BASE, sandbox: isSandbox }, 'PayPal client initialized');
