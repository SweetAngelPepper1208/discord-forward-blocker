// bot.js
import { Client, GatewayIntentBits, Events, WebhookClient } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Setup __dirname for ES modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load .env ---
dotenv.config({ path: path.join(__dirname, '.env') });
console.log('🟡 Loading .env file...');

// --- Read environment variables ---
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const LEVEL_UP_CHANNEL = process.env.LEVEL_UP_CHANNEL;
const PORT = process.env.PORT || 3000;
const DEBUG_MESSAGES = process.env.DEBUG_MESSAGES === 'true';

console.log('✅ .env loaded successfully (if present)');
console.log('--- ENV & runtime info ---');
console.log(`DISCORD_TOKEN: ${DISCORD_TOKEN ? '✅ length ' + DISCORD_TOKEN.length : '❌ missing'}`);
console.log(`WEBHOOK_URL: ${WEBHOOK_URL ? '✅ found' : '❌ missing'}`);
console.log(`LEVEL_UP_CHANNEL: ${LEVEL_UP_CHANNEL || '❌ missing'}`);
console.log(`PORT: ${PORT}`);
console.log(`DEBUG_MESSAGES: ${DEBUG_MESSAGES}`);

// --- Express server for Render ---
const app = express();
app.get('/', (req, res) => res.send('Discord bot is running!'));
app.listen(PORT, () => console.log(`🌐 Express server running on port ${PORT}`));

// --- Create Discord client ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --- Webhook for level-ups ---
let webhookClient;
if (WEBHOOK_URL) {
    webhookClient = new WebhookClient({ url: WEBHOOK_URL });
    console.log('✅ WebhookClient created.');
} else {
    console.warn('❌ WEBHOOK_URL not set, level-up messages will not work.');
}

// --- Discord client debug logging ---
if (DEBUG_MESSAGES) {
    client.on('debug', msg => console.log('🔍 Discord debug:', msg));
    client.on('warn', msg => console.warn('⚠️ Discord warning:', msg));
}

// --- Discord events ---
client.once(Events.ClientReady, () => {
    console.log(`✅ Discord client ready! Logged in as ${client.user.tag}`);
});

// --- Optional: level-up example event ---
client.on(Events.MessageCreate, async message => {
    if (message.content === '!levelup' && webhookClient) {
        await webhookClient.send({
            content: `🎉 Congratulations <@${message.author.id}>! You leveled up!`
        });
        console.log(`🎉 Sent level-up message for ${message.author.tag}`);
    }
});

// --- Attempt Discord login ---
(async () => {
    try {
        console.log('🌐 Attempting Discord login...');
        await client.login(DISCORD_TOKEN);
        console.log('✅ Login attempt finished.');
    } catch (err) {
        console.error('❌ Discord login failed:', err);
    }
})();
