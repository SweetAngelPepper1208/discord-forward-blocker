// bot.js — Full Super Debug Version for Render
import { Client, GatewayIntentBits, Events, WebhookClient } from 'discord.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import WebSocket from 'ws';
import express from 'express';
import fs from 'fs';

// ---------- __dirname ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Load environment ----------
dotenv.config();
console.log('🛠 DEBUG: Environment variables check');
console.log('DISCORD_TOKEN exists:', !!process.env.DISCORD_TOKEN);
console.log('LEVEL_UP_CHANNEL exists:', !!process.env.LEVEL_UP_CHANNEL);
console.log('LEVEL_UP_WEBHOOK_URL exists:', !!process.env.LEVEL_UP_WEBHOOK_URL);
console.log('DEBUG_LOGS:', process.env.DEBUG_LOGS);

// ---------- Token ----------
const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN missing! Check Render environment variables.');
  process.exit(1);
}
console.log('Token length check (should be ~59–72):', TOKEN.length);

// ---------- Exempt channels ----------
const EXEMPT_CHANNELS_SECOND = process.env.EXEMPT_CHANNELS_SECOND
  ? process.env.EXEMPT_CHANNELS_SECOND.split(',')
  : [];
const EXEMPT_CHANNELS_THIRD = process.env.EXEMPT_CHANNELS_THIRD
  ? process.env.EXEMPT_CHANNELS_THIRD.split(',')
  : [];
console.log('Exempt channels (Blessed Cutie):', EXEMPT_CHANNELS_SECOND);
console.log('Exempt channels (Angel in Training):', EXEMPT_CHANNELS_THIRD);

// ---------- Level-up Webhook ----------
let levelUpWebhook = null;
const LEVEL_UP_WEBHOOK_URL = process.env.LEVEL_UP_WEBHOOK_URL;
if (LEVEL_UP_WEBHOOK_URL) {
  try {
    levelUpWebhook = new WebhookClient({ url: LEVEL_UP_WEBHOOK_URL });
    console.log('✅ WebhookClient created (LEVEL_UP_WEBHOOK_URL)');
  } catch (err) {
    console.warn('⚠️ Could not create WebhookClient:', err?.message ?? err);
  }
}

// ---------- Network connectivity test ----------
const DISCORD_GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json';
console.log(`🌐 Testing connection to Discord gateway: ${DISCORD_GATEWAY}`);

let wsOpened = false;
const wsTest = new WebSocket(DISCORD_GATEWAY);

wsTest.on('open', () => {
  wsOpened = true;
  console.log('✅ WebSocket connection to Discord gateway succeeded!');
  wsTest.close();
});

wsTest.on('error', (err) => console.error('❌ WebSocket connection failed:', err));
wsTest.on('close', (code, reason) => console.log(`ℹ️ WebSocket test closed (code=${code}, reason=${reason || 'none'})`));

setTimeout(() => {
  if (!wsOpened) {
    console.warn('⏳ WebSocket test did not open within 10s — check Render network/firewall.');
  }
}, 10000);

// ---------- Create Discord client ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ---------- Process-level error handlers ----------
process.on('unhandledRejection', (reason, promise) => console.error('🧨 UNHANDLED REJECTION:', reason));
process.on('uncaughtException', (err) => console.error('💥 UNCAUGHT EXCEPTION:', err));

// ---------- Client debug logging ----------
client.on('debug', (info) => { if (process.env.DEBUG_LOGS === 'true') console.log('⚡ DEBUG EVENT:', info); });
client.on('warn', (warn) => console.warn('⚡ CLIENT WARNING:', warn));
client.on('error', (err) => console.error('⚡ CLIENT ERROR:', err));
client.on('shardError', (err) => console.error('⚡ SHARD ERROR:', err));
client.on('raw', (packet) => { if (process.env.DEBUG_LOGS === 'true') console.log('🛰 RAW WS EVENT:', JSON.stringify(packet, null, 2)); });

// ---------- Client lifecycle events ----------
let readyFired = false;
client.once(Events.ClientReady, () => {
  readyFired = true;
  console.log('✅ ClientReady fired!');
  console.log('User:', client.user.tag, 'ID:', client.user.id);
  console.log('Ping:', client.ws.ping);
});

client.on('invalidated', () => console.warn('⚠️ Client session invalidated — token may be wrong or revoked.'));
client.on('disconnect', (event) => console.warn('⚠️ Client disconnected:', event));

// ---------- Watchdog ----------
setTimeout(() => {
  if (!readyFired) {
    console.warn(
      '⏳ Bot not ready after 30s. Possible causes:\n' +
      '- Invalid token\n' +
      '- Privileged intents not enabled\n' +
      '- Discord gateway blocked\n' +
      '- Network/firewall issues in Render'
    );
  }
}, 30000);

// ---------- Optional TEST_ONLY_LOGIN ----------
const TEST_ONLY_LOGIN = process.env.TEST_ONLY_LOGIN === 'true';

// ---------- Login ----------
console.log('✅ Attempting Discord login...');
client.login(TOKEN)
  .then(() => {
    console.log('✅ client.login() promise resolved (login attempt sent)');
    if (TEST_ONLY_LOGIN) {
      console.log('🟢 TEST_ONLY_LOGIN enabled — exiting after login attempt.');
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error('❌ Discord login failed. Full error:', err);
    process.exit(1);
  });

// ---------- Express keep-alive server ----------
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = express();
app.get('/', (req, res) => res.send('Angel bot alive!'));
app.listen(PORT, () => console.log(`🌐 Express server started on port ${PORT}`));
