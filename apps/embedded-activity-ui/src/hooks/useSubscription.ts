import { useState, useEffect, useCallback } from 'react';
import { getSubscriptionStatus } from '../lib/api.js';

export type Tier = 'none' | 'grid' | 'pit_wall' | 'paddock';

export function useSubscription(token: string | null, discordId: string | null) {
  const [tier, setTier] = useState<Tier>('none');
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!token || !discordId) return;
    setLoading(true);
    try {
      setTier((await getSubscriptionStatus(token, discordId)).tier);
    } catch {
      setTier('none');
    } finally {
      setLoading(false);
    }
  }, [token, discordId]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);
  return { tier, loading, refresh: fetch_ };
}
