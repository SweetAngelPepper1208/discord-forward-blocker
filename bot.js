// bot.js
import { Client, GatewayIntentBits, WebhookClient } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

// =======================
// Environment & Debug
// =======================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const LEVEL_UP_CHANNEL = process.env.LEVEL_UP_CHANNEL || 'undefined';
const PORT = process.env.PORT || 3000;
const DEBUG_MESSAGES = process.env.DEBUG_MESSAGES === 'true';

console.log('🟡 Loading .env file...');
console.log('✅ .env loaded successfully (if present)');
console.log('--- ENV & runtime info ---');
console.log(`DISCORD_TOKEN: ${DISCORD_TOKEN ? '✅ length ' + DISCORD_TOKEN.length : '❌ MISSING'}`);
console.log(`WEBHOOK_URL: ${WEBHOOK_URL ? '✅ found' : '❌ MISSING'}`);
console.log(`LEVEL_UP_CHANNEL: ${LEVEL_UP_CHANNEL}`);
console.log(`PORT: ${PORT}`);
console.log(`DEBUG_MESSAGES: ${DEBUG_MESSAGES}`);

// =======================
// Express server (keep-alive for Render)
// =======================
const app = express();
app.get('/', (req, res) => res.send('Bot is running ✅'));
app.listen(PORT, () => console.log(`🌐 Express server running on port ${PORT}`));

// =======================
// Discord Client Setup
// =======================
console.log('🟡 Initializing Discord client...');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// =======================
// Webhook Setup
// =======================
let webhookClient;
if (WEBHOOK_URL) {
  try {
    webhookClient = new WebhookClient({ url: WEBHOOK_URL });
    console.log('✅ WebhookClient created.');
  } catch (err) {
    console.error('❌ Failed to create WebhookClient:', err);
  }
} else {
  console.warn('⚠️ WEBHOOK_URL not provided. Level-up messages will not be sent.');
}

// =======================
// Client Event Listeners
// =======================
client.on('ready', () => {
  console.log(`✅ Discord client ready! Logged in as ${client.user.tag}`);
});

client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

client.on('shardError', (error) => {
  console.error('❌ Discord shard error:', error);
});

// =======================
// Login with debug
// =======================
console.log('🌐 Attempting Discord login...');
client.login(DISCORD_TOKEN)
  .then(() => console.log('🔑 Login attempt sent.'))
  .catch(err => console.error('❌ Login failed:', err));

// =======================
// Example Level-Up function
// =======================
function sendLevelUpMessage(userTag, level) {
  if (!webhookClient) return;
  const messages = {
    5: `AHHH OMG!!! ${userTag} <a:HeartPop:1397425476426797066> You just leveled up to a Blessed Cutie!!`,
    12: `***A new angel has been born! Welcome to the gates of heaven ${userTag}!!!***`,
    20: `***OMG!!! OMG!!! OMG!!! ${userTag} just earned their very own wings~!!!***`,
    28: `<a:HeartPop:1397425476426797066>*** KYAAA!!! OMG!!! OMG!!! OMG!!! ${userTag} is now a Full Fledged Angel!!!***`
  };
  const msg = messages[level];
  if (msg) {
    webhookClient.send(msg)
      .then(() => DEBUG_MESSAGES && console.log(`🌟 Level-up message sent for ${userTag}, level ${level}`))
      .catch(err => console.error('❌ Failed to send level-up message:', err));
  }
}

// Example usage (for testing)
if (DEBUG_MESSAGES) {
  setTimeout(() => sendLevelUpMessage('TestUser#0001', 5), 5000);
  setTimeout(() => sendLevelUpMessage('TestUser#0001', 12), 10000);
}
