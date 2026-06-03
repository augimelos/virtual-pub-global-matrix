import type { Interaction } from 'discord.js';
import { handleSubscribe } from '../commands/subscribe.js';
import { handleCommandCenter } from '../commands/commandCenter.js';
import { handlePredict } from '../commands/predict.js';
import { handlePaywallButton } from '../middleware/subscriptionGuard.js';
import { logger } from '../lib/discordClient.js';

export async function handleInteraction(interaction: Interaction): Promise<void> {
  if (interaction.isChatInputCommand()) {
    try {
      switch (interaction.commandName) {
        case 'subscribe':
          await handleSubscribe(interaction);
          break;
        case 'command-center':
          await handleCommandCenter(interaction);
          break;
        case 'predict':
          await handlePredict(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown command.', ephemeral: true });
      }
    } catch (err) {
      logger.error({ err, cmd: interaction.commandName }, 'Command error');
      const msg = 'An error occurred. Please try again.';
      if (interaction.replied || interaction.deferred)
        await interaction.followUp({ content: msg, ephemeral: true });
      else await interaction.reply({ content: msg, ephemeral: true });
    }
  } else if (interaction.isButton() && interaction.customId.startsWith('vpub_')) {
    await handlePaywallButton(interaction).catch(err => logger.error({ err }, 'Button error'));
  }
}
