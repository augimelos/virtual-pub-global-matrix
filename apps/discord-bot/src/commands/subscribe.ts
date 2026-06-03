import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type MessageActionRowComponentBuilder,
} from 'discord.js';

export const subscribeCommand = new SlashCommandBuilder()
  .setName('subscribe')
  .setDescription('Subscribe to Virtual Pub or manage your subscription')
  .addSubcommand(s => s.setName('plans').setDescription('View available plans'))
  .addSubcommand(s => s.setName('status').setDescription('Check your subscription'))
  .addSubcommand(s => s.setName('manage').setDescription('Manage your subscription'));

export async function handleSubscribe(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();
  if (sub === 'plans' || sub === undefined) {
    const embed = new EmbedBuilder()
      .setTitle('Virtual Pub Plans')
      .setColor(0x00cc66)
      .setDescription(
        '**Grid** â€” $2.99/mo\nLive stream, position tracker, weather, gap timers\n\n**Pit Wall** â€” $3.99/mo\nTeam radio, tyre strategy, predictions + Grid\n\n**Paddock** â€” $4.99/mo\nAI personas, auto clips, priority stream + Pit Wall\n\nAll plans: **3-day free trial**, cancel anytime via PayPal.',
      );
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`vpub_sub:grid:${interaction.user.id}`)
        .setLabel('Grid $2.99/mo')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`vpub_sub:pit_wall:${interaction.user.id}`)
        .setLabel('Pit Wall $3.99/mo')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`vpub_sub:paddock:${interaction.user.id}`)
        .setLabel('Paddock $4.99/mo')
        .setStyle(ButtonStyle.Danger),
    );
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  } else if (sub === 'status') {
    await interaction.reply({
      content: 'Use `/subscribe plans` to see available plans.',
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Manage Subscription')
          .setDescription(
            'Manage your subscription at [PayPal](https://www.paypal.com/myaccount/autopay/)',
          )
          .setColor(0x0070ba),
      ],
      ephemeral: true,
    });
  }
}
