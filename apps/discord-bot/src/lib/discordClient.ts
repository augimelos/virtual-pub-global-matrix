import { Client, GatewayIntentBits, Partials } from 'discord.js';
import pino from 'pino';

const isProd = process.env['NODE_ENV'] === 'production';
export const logger = pino({
  name: 'virtual-pub-bot',
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      },
});

let client: Client | null = null;

export function getDiscordClient(): Client {
  if (client) return client;
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });
  return client;
}

export async function destroyDiscordClient(): Promise<void> {
  if (client) {
    client.destroy();
    client = null;
  }
}
