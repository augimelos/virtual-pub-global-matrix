import { useState, useEffect, useCallback } from 'react';
import { initializeDiscord, type DiscordAuth } from '../lib/discordSdk.js';

export function useDiscordSdk() {
  const [auth, setAuth] = useState<DiscordAuth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAuth(await initializeDiscord());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);
  return { auth, loading, error, retry: init };
}
