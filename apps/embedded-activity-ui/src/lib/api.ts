const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export interface SubStatus {
  tier: 'none' | 'grid' | 'pit_wall' | 'paddock';
  status: string;
  expiresAt: string | null;
}

export async function getSubscriptionStatus(token: string, discordId: string): Promise<SubStatus> {
  const res = await fetch(`${API}/auth/subscription?discord_id=${discordId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { tier: 'none', status: 'unknown', expiresAt: null };
  return res.json() as Promise<SubStatus>;
}
