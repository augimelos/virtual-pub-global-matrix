import { DiscordSDK } from '@discord/embedded-app-sdk';

const APP_ID = import.meta.env.VITE_DISCORD_APPLICATION_ID ?? '';
export const discordSdk = new DiscordSDK(APP_ID);

export interface DiscordAuth {
  accessToken: string;
  user: {
    id: string;
    username: string;
    avatar?: string | null | undefined;
    global_name?: string | null | undefined;
  };
  guildId: string | null;
  channelId: string | null;
}

export async function initializeDiscord(): Promise<DiscordAuth> {
  await discordSdk.ready();

  const { code } = await discordSdk.commands.authorize({
    client_id: APP_ID,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['identify', 'guilds'],
  });

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';
  const res = await fetch(`${apiBase}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const { access_token } = (await res.json()) as { access_token: string };

  const auth = await discordSdk.commands.authenticate({ access_token });
  return {
    accessToken: access_token,
    user: auth.user,
    guildId: discordSdk.guildId,
    channelId: discordSdk.channelId,
  };
}
