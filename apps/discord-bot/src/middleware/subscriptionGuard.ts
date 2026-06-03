import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { logger } from '../lib/discordClient.js';

type Tier = 'none' | 'grid' | 'pit_wall' | 'paddock';
const HIERARCHY: Record<Tier, number> = { none: 0, grid: 1, pit_wall: 2, paddock: 3 };
const NAMES: Record<string, string> = { grid: 'Grid', pit_wall: 'Pit Wall', paddock: 'Paddock' };

interface GuardDb {
  users: { id: string; discord_id: string; tier: Tier; created_at: Date; updated_at: Date };
}
let db: Kysely<GuardDb> | null = null;

function getDb(): Kysely<GuardDb> {
  if (db) return db;
  db = new Kysely<GuardDb>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({
        connectionString: process.env['DATABASE_URL'],
        max: 3,
        application_name: 'vpub-bot-guard',
      }),
    }),
  });
  return db;
}

export async function checkSubscription(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  opts: { requiredTier: 'grid' | 'pit_wall' | 'paddock'; featureName: string },
): Promise<boolean> {
  const user = await getDb()
    .selectFrom('users')
    .select('tier')
    .where('discord_id', '=', interaction.user.id)
    .executeTakeFirst();
  const userTier: Tier = user?.tier ?? 'none';

  if (HIERARCHY[userTier] >= HIERARCHY[opts.requiredTier]) return true;

  const embed = new EmbedBuilder()
    .setTitle('Subscription Required')
    .setDescription(
      `**${opts.featureName}** requires a **${NAMES[opts.requiredTier]}** plan or higher.\n\n${userTier === 'none' ? "You don't have a subscription yet." : `Your plan: **${NAMES[userTier]}**`}\n\nUse \`/subscribe plans\` to see options!`,
    )
    .setColor(0xff4444);

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

  if (interaction.replied || interaction.deferred)
    await interaction.followUp({ embeds: [embed], components: [row], ephemeral: true });
  else await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  return false;
}

export function initializeCacheInvalidationListener(): void {
  logger.info('Cache invalidation listener ready');
}
export async function destroySubscriptionGuard(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}
export async function handlePaywallButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.customId.startsWith('vpub_sub:')) return;
  const [, tier, userId] = interaction.customId.split(':');
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: "This button isn't for you.", ephemeral: true });
    return;
  }
  await interaction.reply({
    content: `To subscribe to **${NAMES[tier ?? ''] ?? tier}**, visit: https://www.paypal.com\n\nPayPal checkout integration coming soon!`,
    ephemeral: true,
  });
}
