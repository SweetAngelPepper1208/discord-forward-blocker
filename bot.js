import { Client, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from same folder as bot.js
dotenv.config({ path: path.join(__dirname, '.env') });

// Keep-alive server for Render
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(3000, () => console.log('Keep-alive server running on port 3000'));

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// Example restricted roles (replace IDs)
const restrictedRoles = [
    '1399135278396080238', // First-Time Believer
    '1399992492568350794', // Blessed Cutie
    '1399993506759573616'  // Angel in Training
];

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Check for restricted roles
    const hasRestrictedRole = restrictedRoles.some(role => message.member.roles.cache.has(role));

    // Delete forwarded Discord links for restricted roles
    if (hasRestrictedRole && message.content.includes('https://discord.com/channels/')) {
        await message.delete().catch(() => {});
        return;
    }

    // Delete uploaded GIF, WEBP, or APNG files for restricted roles
    if (hasRestrictedRole && message.attachments.size > 0) {
        const restrictedExtensions = ['.gif', '.webp', '.apng'];
        const isRestrictedFile = message.attachments.some(attachment =>
            restrictedExtensions.some(ext => attachment.name?.toLowerCase().endsWith(ext))
        );

        if (isRestrictedFile) {
            await message.delete().catch(() => {});
        }
    }
});

// Login with token
client.login(process.env.DISCORD_TOKEN);

