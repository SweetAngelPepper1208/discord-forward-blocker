// bot.js
import { Client, GatewayIntentBits, WebhookClient, Events } from 'discord.js';
import express from 'express';
import fs from 'fs';
import path from 'path';

// ----------- Secret loading ----------------
function readSecret(name) {
  const renderPath = path.join('/etc/secrets', name); // Render secret path
  const localPath = path.join('./secrets', name);     // Local fallback

  if (fs.existsSync(renderPath)) return fs.readFileSync(renderPath, 'utf8').trim();
  if (fs.existsSync(localPath)) return fs.readFileSync(localPath, 'utf8').trim();

  return undefined;
}

// Load secrets
const DISCORD_TOKEN = readSecret('DISCORD_TOKEN');
const WEBHOOK_URL = readSecret('WEBHOOK_URL');
const LEVEL_UP_CHANNEL = readSecret('LEVEL_UP_CHANNEL');
const PORT = process.env.PORT || 3000;
const DEBUG_MESSAGES = readSecret('DEBUG_MESSAGES') === 'true';

// ----------- Debug info ----------------
console.log('--- DEBUG: Loaded secrets ---');
console.log('DISCORD_TOKEN present:', !!DISCORD_TOKEN);
console.log('WEBHOOK_URL present:', !!WEBHOOK_URL);
console.log('LEVEL_UP_CHANNEL:', LEVEL_UP_CHANNEL);
console.log('PORT:', PORT);
console.log('DEBUG_MESSAGES:', DEBUG_MESSAGES);

// ----------- Webhook ----------------
let webhook;
if (WEBHOOK_URL) {
  try {
    webhook = new WebhookClient({ url: WEBHOOK_URL });
    console.log('✅ WebhookClient created.');
  } catch (err) {
    console.error('❌ Failed to create WebhookClient:', err);
  }
} else {
  console.warn('⚠️ WEBHOOK_URL not set, level-up messages disabled.');
}

// ----------- Discord Client ----------------
if (!DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN missing! Cannot start bot.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Discord bot logged in as ${client.user.tag}`);
});

// Example: simulate a level-up message on bot ready
client.once(Events.ClientReady, () => {
  if (webhook && LEVEL_UP_CHANNEL) {
    webhook.send({
      content: `🎉 Test level-up message in channel <#${LEVEL_UP_CHANNEL}>!`,
    }).catch(console.error);
  }
});

// ----------- Login ----------------
console.log('🌐 Attempting Discord login...');
client.login(DISCORD_TOKEN).catch(err => {
  console.error('❌ Failed to login to Discord:', err);
});

// ----------- Express keep-alive server ----------------
const app = express();
app.get('/', (req, res) => res.send('Bot is running.'));
app.listen(PORT, () => console.log(`🌐 Express server running on port ${PORT}`));
