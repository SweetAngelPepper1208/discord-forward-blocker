// bot.js — Discord bot with level-up messages & moderation
import { Client, GatewayIntentBits, Events, WebhookClient, Partials } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------- __dirname ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Load environment ----------
dotenv.config();
const DEBUG_MESSAGES = (process.env.DEBUG_MESSAGES || 'true').toLowerCase() === 'true';
const TOKEN = process.env.DISCORD_TOKEN;
const LEVEL_UP_CHANNEL = process.env.LEVEL_UP_CHANNEL || '1397916231545389096';
const WEBHOOK_URL = process.env.WEBHOOK_URL || '';
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Optional exempt channels
const EXEMPT_CHANNELS_SECOND = process.env.EXEMPT_CHANNELS_SECOND
  ? process.env.EXEMPT_CHANNELS_SECOND.split(',')
  : [];
const EXEMPT_CHANNELS_THIRD = process.env.EXEMPT_CHANNELS_THIRD
  ? process.env.EXEMPT_CHANNELS_THIRD.split(',')
  : [];

// ---------- Debug check ----------
console.log('🛠 Environment check');
console.log('DISCORD_TOKEN exists:', !!TOKEN);
console.log('LEVEL_UP_CHANNEL exists:', !!LEVEL_UP_CHANNEL);
console.log('WEBHOOK_URL exists:', !!WEBHOOK_URL);
console.log('DEBUG_MESSAGES:', DEBUG_MESSAGES);
console.log('Exempt channels (Blessed Cutie):', EXEMPT_CHANNELS_SECOND);
console.log('Exempt channels (Angel in Training):', EXEMPT_CHANNELS_THIRD);

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN missing!');
  process.exit(1);
}

// ---------- Create WebhookClient ----------
let levelUpWebhook = null;
if (WEBHOOK_URL) {
  try {
    levelUpWebhook = new WebhookClient({ url: WEBHOOK_URL });
    console.log('✅ WebhookClient created.');
  } catch (err) {
    console.warn('⚠️ Could not create WebhookClient:', err?.message ?? err);
  }
}

// ---------- Role IDs ----------
const ROLE_FIRST = '1399135278396080238';
const ROLE_SECOND = '1399992492568350794';
const ROLE_THIRD = '1399993506759573616';
const ROLE_FOURTH = '1399994681970004021';
const ROLE_FIFTH = '1399994799334887495';
const ROLE_SIXTH = '1399999195309408320';
const RESTRICTED_ROLE_IDS = [ROLE_FIRST, ROLE_SECOND, ROLE_THIRD, ROLE_FOURTH];

// ---------- Level-up messages ----------
const ROLE_MESSAGES = {
  [ROLE_SECOND]: (mention) => `AHHH OMG!!! ${mention} You leveled up to Blessed Cutie! 🌸`,
  [ROLE_THIRD]: (mention) => `***A new angel has been born! Welcome to the gates of heaven ${mention}!***`,
  [ROLE_FOURTH]: (mention) => `***OMG!!! ${mention} just earned their very own wings~!!!***`,
  [ROLE_FIFTH]: (mention) => `***${mention} is now a Full-Fledged Angel!***`,
  [ROLE_SIXTH]: (mention) => `***${mention} has been silenced by Heaven.***`,
};

// ---------- Create Discord client ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// ---------- Process-level debug ----------
process.on('unhandledRejection', (reason) => console.error('🧨 UNHANDLED REJECTION:', reason));
process.on('uncaughtException', (err) => console.error('💥 UNCAUGHT EXCEPTION:', err));

// ---------- Client Ready ----------
client.once(Events.ClientReady, () => {
  console.log('✅ Logged in as', client.user.tag);
  console.log('ℹ️ Level-up channel ID:', LEVEL_UP_CHANNEL);
});

// ---------- Express keep-alive ----------
const app = express();
app.get('/', (req, res) => res.send('Angel bot alive!'));
app.listen(PORT, () => console.log(`🌐 Express server started on port ${PORT}`));

// ---------- Login ----------
console.log('✅ Starting bot...');
client.login(TOKEN).catch((err) => {
  console.error('❌ Discord login failed:', err);
  process.exit(1);
});

// ---------- GuildMemberUpdate / Role messages ----------
const recentRoleMessages = new Map();
const DEBOUNCE_MS = 2000;

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    const added = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
    if (!added.size) return;

    for (const role of added.values()) {
      if (!ROLE_MESSAGES[role.id]) continue;

      const key = `${newMember.id}-${role.id}`;
      const now = Date.now();
      if (recentRoleMessages.has(key) && now - recentRoleMessages.get(key) < DEBOUNCE_MS) continue;
      recentRoleMessages.set(key, now);

      const mention = `<@${newMember.id}>`;
      const text = ROLE_MESSAGES[role.id](mention);

      if (levelUpWebhook) {
        await levelUpWebhook.send({ content: text, allowedMentions: { parse: ['users'] } }).catch(() => {});
      } else {
        const ch = await newMember.guild.channels.fetch(LEVEL_UP_CHANNEL).catch(() => null);
        if (ch?.isTextBased()) await ch.send({ content: text }).catch(() => {});
      }

      DEBUG_MESSAGES && console.log(`📣 Sent role-up message for ${newMember.user.tag} role=${role.id}`);
    }
  } catch (err) {
    console.error('GuildMemberUpdate handler error:', err);
  }
});
