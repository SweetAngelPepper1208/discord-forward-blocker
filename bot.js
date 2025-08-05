import { Client, GatewayIntentBits, Events } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

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

  console.log(`📨 "${message.content}" from ${message.author.username} | type: ${message.type}`);

  // ✅ Allow if message has text or media
  if ((message.content && message.content.trim().length > 0) || message.attachments.size > 0) return;

  try {
    const member = await message.guild.members.fetch(message.author.id);
    const hasBlockedRole = BLOCKED_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));

    if (hasBlockedRole) {
      await message.delete();
      console.log("❌ Deleted forwarded or empty message.");
    }
  } catch (err) {
    console.error("⚠️ Deletion failed:", err.message);
  }
});

const app = express();
app.get('/', (_, res) => res.send('Bot is running!'));
app.listen(3000, () => console.log('🌐 Keep-alive server active'));

client.login(process.env.TOKEN);