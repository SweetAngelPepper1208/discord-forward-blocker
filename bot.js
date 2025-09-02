import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, WebhookClient } from 'discord.js';
import express from 'express';

// --- SECRETS LOADING ---
const secretsDir = path.resolve('./secrets');

function readSecret(name) {
  const filePath = path.join(secretsDir, name);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8').trim() : undefined;
}

// Load secrets
const DISCORD_TOKEN = readSecret('DISCORD_TOKEN');
const WEBHOOK_URL = readSecret('WEBHOOK_URL');
const LEVEL_UP_CHANNEL = readSecret('LEVEL_UP_CHANNEL');

// Render assigns a port via environment variable; fallback to 3000
const PORT = process.env.PORT || readSecret('PORT') || 3000;

// --- DEBUG INFO ---
console.log('--- DEBUG: Loaded secrets ---');
console.log('DISCORD_TOKEN present:', !!DISCORD_TOKEN);
console.log('WEBHOOK_URL present:', !!WEBHOOK_URL);
console.log('LEVEL_UP_CHANNEL:', LEVEL_UP_CHANNEL);
console.log('PORT:', PORT);

// --- DISCORD CLIENT ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const webhook = new WebhookClient({ url: WEBHOOK_URL });

// --- EXPRESS KEEP-ALIVE ---
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(PORT, () => console.log(`Express running on port ${PORT}`));

// --- LOGIN ---
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN).catch(err => console.error('❌ Discord login failed:', err));

// --- EXAMPLE LEVEL-UP MESSAGE ---
client.on('messageCreate', message => {
  if (message.content === '!levelup') {
    webhook.send(`🎉 ${message.author.username} leveled up!`);
  }
});
