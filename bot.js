import { Client, GatewayIntentBits, Events } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '.env') });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Roles restricted from forwarded messages
const BLOCKED_ROLE_IDS = [
  "1399135278396080238", // First-Time Believer
  "1399992492568350794", // Blessed Cutie
  "1399993506759573616"  // Angel in Training
];

client.once(Events.ClientReady, () => {
  console.log(`🚀 Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  console.log(`📨 Message from ${message.author.username} in #${message.channel.name}: "${message.content}"`);
  console.log(`📝 Type: ${message.type}`);

  // Skip if there's real message content
  if (message.content && message.content.trim().length > 0) return;

  try {
    const member = await message.guild.members.fetch(message.author.id);
    const hasBlockedRole = BLOCKED_ROLE_IDS.some(id => member.roles.cache.has(id));

    if (hasBlockedRole) {
      await message.delete();
      console.log("❌ Deleted empty message from restricted role.");
    }
  } catch (err) {
    console.error("⚠️ Error deleting message:", err.message);
  }
});

// Web server for keep-alive
const app = express();
app.get('/', (_, res) => res.send('Bot is online!'));
app.listen(3000, () => console.log('🌐 Keep-alive server running on port 3000'));

// Start bot
client.login(process.env.TOKEN);