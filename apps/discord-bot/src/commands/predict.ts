import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { checkSubscription } from '../middleware/subscriptionGuard.js';

export const predictCommand = new SlashCommandBuilder()
  .setName('predict')
  .setDescription('Make race predictions');

export async function handlePredict(interaction: ChatInputCommandInteraction): Promise<void> {
  if (
    !(await checkSubscription(interaction, {
      requiredTier: 'pit_wall',
      featureName: 'Prediction Engine',
    }))
  )
    return;
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('Prediction Engine')
        .setDescription('Prediction system coming soon! Stay tuned.')
        .setColor(0xffaa00),
    ],
    ephemeral: true,
  });
}
