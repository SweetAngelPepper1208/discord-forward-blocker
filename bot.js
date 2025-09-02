// bot.js
import { Client, GatewayIntentBits, WebhookClient, Events } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Setup __dirname for ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load .env ---
dotenv.config({ path: path.join(__dirname, '.env') });

// --- Environment Variables ---
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const LEVEL_UP_CHANNEL = process.env.LEVEL_UP_CHANNEL;
const DEBUG_MESSAGES = process.env.DEBUG_MESSAGES === 'true';
const PORT = process.env.PORT || 3000;

console.log('🟡 Loading .env file...');
console.log(`✅ .env loaded successfully (if present)`);

// --- ENV & Runtime Debug ---
console.log('--- ENV & runtime info ---');
console.log(`DISCORD_TOKEN: ${DISCORD_TOKEN ? '✅ length ' + DISCORD_TOKEN.length : '❌ missing'}`);
console.log(`WEBHOOK_URL: ${WEBHOOK_URL ? '✅ found' : '❌ missing'}`);
console.log(`LEVEL_UP_CHANNEL: ${LEVEL_UP_CHANNEL || '❌ missing'}`);
console.log(`PORT: ${PORT}`);
console.log(`DEBUG_MESSAGES: ${DEBUG_MESSAGES}`);

// --- Initialize Express (keep-alive for Render) ---
const app = express();
app.get('/', (req, res) => res.send('Discord bot is running.'));
app.listen(PORT, () => console.log(`🌐 Express server running on port ${PORT}`));

// --- Initialize Discord Client ---
console.log('🟡 Initializing Discord client...');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// --- Debug events ---
client.on('debug', msg => DEBUG_MESSAGES && console.log('🛠 DISCORD DEBUG:', msg));
client.on('error', err => console.error('❌ DISCORD ERROR:', err));
client.on('warn', warn => console.warn('⚠️ DISCORD WARN:', warn));
client.on('shardDisconnect', (event, shardID) => console.warn(`⚠️ Shard ${shardID} disconnected`, event));
client.on('shardError', error => console.error('❌ Shard error:', error));
client.on('shardReady', shardID => console.log(`✅ Shard ${shardID} ready`));

// --- Webhook Client ---
let webhookClient;
if (WEBHOOK_URL) {
    try {
        webhookClient = new WebhookClient({ url: WEBHOOK_URL });
        console.log('✅ WebhookClient created.');
    } catch (err) {
        console.error('❌ Failed to create WebhookClient:', err);
    }
} else {
    console.warn('❌ WEBHOOK_URL not set. Level-up messages will not send.');
}

// --- Ready Event ---
client.once('ready', () => {
    console.log(`✅ Bot ready! Logged in as ${client.user.tag}`);
});

// --- Login ---
console.log('🌐 Attempting Discord login...');
if (!DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN missing! Cannot login.');
} else {
    client.login(DISCORD_TOKEN).catch(err => {
        console.error('❌ Failed to login:', err);
    });
}

// --- Example Level-up Message Function ---
export function sendLevelUpMessage(user, level) {
    if (!webhookClient) return;
    let message;
    switch(level) {
        case 5:
            message = `AHHH OMG!!! ${user} <a:HeartPop:1397425476426797066> You just leveled up to a Blessed Cutie!!`;
            break;
        case 12:
            message = `***A new angel has been born! Welcome to the gates of heaven ${user}!!!***`;
            break;
        case 20:
            message = `***OMG!!! OMG!!! OMG!!! ${user} just earned their very own wings~!!!***`;
            break;
        case 28:
            message = `<a:HeartPop:1397425476426797066>*** KYAAA!!! OMG!!! OMG!!! OMG!!! ${user} is now a Full-Fledged Angel!!!***`;
            break;
        default:
            message = `${user} just leveled up to ${level}!`;
    }

    webhookClient.send({ content: message })
        .then(() => DEBUG_MESSAGES && console.log(`📤 Sent level-up message for ${user}, level ${level}`))
        .catch(err => console.error('❌ Failed to send webhook message:', err));
}

// --- Optional test for Render: ---
if (DEBUG_MESSAGES) {
    setTimeout(() => {
        console.log('💡 DEBUG: Render environment test complete.');
    }, 5000);
}
