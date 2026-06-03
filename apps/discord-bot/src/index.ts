import dotenv from 'dotenv';
import { resolve } from 'node:path';
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '../../.env') });
import { getDiscordClient, destroyDiscordClient, logger } from './lib/discordClient.js';
import { handleReady } from './events/ready.js';
import { handleInteraction } from './events/interactionCreate.js';
import { destroySubscriptionGuard } from './middleware/subscriptionGuard.js';

const token = process.env['DISCORD_BOT_TOKEN'];
if (!token) {
  logger.fatal('DISCORD_BOT_TOKEN not set');
  process.exit(1);
}

const client = getDiscordClient();
client.once('ready', c => handleReady(c).catch(e => logger.error({ e }, 'Ready error')));
client.on('interactionCreate', i =>
  handleInteraction(i).catch(e => logger.error({ e }, 'Interaction error')),
);
client.on('error', e => logger.error({ e }, 'Client error'));

let stopping = false;
async function shutdown(sig: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  logger.info({ sig }, 'Shutting down bot...');
  setTimeout(() => process.exit(1), 10_000).unref();
  await destroySubscriptionGuard();
  await destroyDiscordClient();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', e => {
  logger.fatal({ e }, 'Uncaught');
  shutdown('uncaught');
});

logger.info('Connecting to Discord...');
client.login(token);
