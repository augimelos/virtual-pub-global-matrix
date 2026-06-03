import { Client, REST, Routes } from 'discord.js';
import { subscribeCommand } from '../commands/subscribe.js';
import { commandCenterCommand } from '../commands/commandCenter.js';
import { predictCommand } from '../commands/predict.js';
import { initializeCacheInvalidationListener } from '../middleware/subscriptionGuard.js';
import { logger } from '../lib/discordClient.js';

export async function handleReady(client: Client<true>): Promise<void> {
  logger.info({ tag: client.user.tag, guilds: client.guilds.cache.size }, 'Virtual Pub Bot ONLINE');

  const rest = new REST({ version: '10' }).setToken(process.env['DISCORD_BOT_TOKEN'] ?? '');
  const commands = [
    subscribeCommand.toJSON(),
    commandCenterCommand.toJSON(),
    predictCommand.toJSON(),
  ];
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
  logger.info({ count: commands.length }, 'Slash commands registered');

  initializeCacheInvalidationListener();
}
