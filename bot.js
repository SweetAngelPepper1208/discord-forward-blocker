// bot.js
import { Client, GatewayIntentBits, Events, Partials, WebhookClient } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------- Resolve __dirname / __filename ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Load environment ----------
const secretEnvPath = '/run/secrets/.env';
if (fs.existsSync(secretEnvPath)) {
  dotenv.config({ path: secretEnvPath });
  console.log('✅ Loaded .env from Render secret file');
} else {
  dotenv.config({ path: path.join(__dirname, '.env') });
  console.log('✅ Loaded local .env file');
}

// ---------- Environment variables ----------
const TOKEN = process.env.DISCORD_TOKEN;
const LEVEL_UP_CHANNEL = process.env.LEVEL_UP_CHANNEL || '1397916231545389096';
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const LEVEL_UP_WEBHOOK_URL = process.env.WEBHOOK_URL || '';
const DEBUG_MESSAGES = (process.env.DEBUG_MESSAGES || 'true').toLowerCase() === 'true';

// ---------- Basic checks ----------
console.log('🛠 DEBUG: Environment variables check');
console.log('DISCORD_TOKEN exists:', !!TOKEN);
console.log('LEVEL_UP_CHANNEL exists:', !!LEVEL_UP_CHANNEL);
console.log('LEVEL_UP_WEBHOOK_URL exists:', !!LEVEL_UP_WEBHOOK_URL);
console.log('DEBUG_MESSAGES:', DEBUG_MESSAGES);
console.log('Token length check (should be ~59–72):', TOKEN?.length);

// ---------- Create WebhookClient ----------
let levelUpWebhook = null;
if (LEVEL_UP_WEBHOOK_URL) {
  try {
    levelUpWebhook = new WebhookClient({ url: LEVEL_UP_WEBHOOK_URL });
    console.log('✅ WebhookClient created.');
  } catch (err) {
    console.warn('⚠️ Could not create WebhookClient:', err?.message || err);
  }
}

// ---------- Level-up role messages ----------
const ROLE_SECOND = '1399992492568350794';
const ROLE_THIRD = '1399993506759573616';
const ROLE_FOURTH = '1399994681970004021';
const ROLE_FIFTH = '1399994799334887495';
const ROLE_MESSAGES = {
  [ROLE_SECOND]: (mention) => `AHHH OMG!!! ${mention} You just leveled up to a Blessed Cutie! 🌸✨`,
  [ROLE_THIRD]: (mention) => `***A new angel has been born! Welcome to the gates of heaven ${mention}!!!***`,
  [ROLE_FOURTH]: (mention) => `***OMG!!! OMG!!! OMG!!! ${mention} just earned their very own wings~!!!***`,
  [ROLE_FIFTH]: (mention) => `<a:HeartPop:1397425476426797066>*** KYAAA!!! OMG!!! ${mention} is now a Full Fledged Angel!!!***`,
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

// ---------- Debug and error handling ----------
process.on('unhandledRejection', (reason) => console.error('🧨 UNHANDLED REJECTION:', reason));
process.on('uncaughtException', (err) => console.error('💥 UNCAUGHT EXCEPTION:', err));

client.on('debug', (info) => {
  if (DEBUG_MESSAGES) console.log('🛠 DISCORD DEBUG:', info);
});
client.on('shardError', (error) => console.error('💥 Shard error:', error));
client.on('error', (error) => console.error('💥 Client error:', error));
client.on('warn', (warning) => console.warn('⚠️ Client warning:', warning));

// ---------- Ready event ----------
client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`ℹ️ Level-up channel ID: ${LEVEL_UP_CHANNEL}`);
});

// ---------- Watchdog ----------
setTimeout(() => {
  if (!client.isReady()) {
    console.warn('⏳ Bot not ready after 30s. Check token, intents, or network.');
  }
}, 30000);

// ---------- Role change handler ----------
const recentRoleMessages = new Map();
const DEBOUNCE_MS = 2000;

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    const added = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
    if (!added.size) return;

    for (const role of added.values()) {
      if (ROLE_MESSAGES[role.id]) {
        const key = `${newMember.id}-${role.id}`;
        const now = Date.now();

        if (recentRoleMessages.has(key) && now - recentRoleMessages.get(key) < DEBOUNCE_MS) {
          if (DEBUG_MESSAGES) console.log(`🟨 Debounced role message for ${newMember.user.tag} role=${role.id}`);
          continue;
        }

        recentRoleMessages.set(key, now);
        const mention = `<@${newMember.id}>`;
        const text = ROLE_MESSAGES[role.id](mention);

        if (DEBUG_MESSAGES) console.log(`📣 Sending role-up message for ${newMember.user.tag} role=${role.id}`);

        if (levelUpWebhook) {
          await levelUpWebhook.send({ content: text, allowedMentions: { parse: ['users'] } }).catch(async (err) => {
            console.warn('Could not send webhook message:', err?.message || err);
            const ch = await newMember.guild.channels.fetch(LEVEL_UP_CHANNEL).catch(() => null);
            if (ch?.isTextBased()) await ch.send({ content: text }).catch(() => {});
          });
        } else {
          const ch = await newMember.guild.channels.fetch(LEVEL_UP_CHANNEL).catch(() => null);
          if (ch?.isTextBased()) await ch.send({ content: text }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('GuildMemberUpdate handler error:', err);
  }
});

// ---------- Express keep-alive ----------
const app = express();
app.get('/', (req, res) => res.send('Angel bot alive!'));
app.listen(PORT, () => console.log(`🌐 Express server started on port ${PORT}`));

// ---------- Login ----------
if (!TOKEN) {
  console.error('❌ Missing DISCORD_TOKEN in environment — stopping.');
  process.exit(1);
}
console.log('🌐 Attempting Discord login...');
client.login(TOKEN).catch((err) => {
  console.error('❌ Discord login failed:', err);
  process.exit(1);
});
