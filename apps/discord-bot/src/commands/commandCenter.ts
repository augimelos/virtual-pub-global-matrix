import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { checkSubscription } from '../middleware/subscriptionGuard.js';

export const commandCenterCommand = new SlashCommandBuilder()
  .setName('command-center')
  .setDescription('Launch the live race command center');

export async function handleCommandCenter(interaction: ChatInputCommandInteraction): Promise<void> {
  if (
    !(await checkSubscription(interaction, {
      requiredTier: 'grid',
      featureName: 'Live Race Command Center',
    }))
  )
    return;
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('Virtual Pub â€” Command Center')
        .setDescription(
          'The live race command center is ready!\nJoin a voice channel and click the activity to start.',
        )
        .setColor(0x00cc66),
    ],
  });
}
