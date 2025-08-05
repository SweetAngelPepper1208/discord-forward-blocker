import { Client, GatewayIntentBits, Events } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Role IDs to block
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

  console.log(`📨 "${message.content}" from ${message.author.username} | Type: ${message.type}`);

  try {
    const member = await message.guild.members.fetch(message.author.id);
    const hasBlockedRole = BLOCKED_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));

    if (hasBlockedRole) {
      const isEmptyForwarded = !message.content && message.attachments.size === 0 && message.embeds.length === 0;

      // Delete empty/forwarded messages
      if (isEmptyForwarded) {
        await message.delete();
        console.log("🗑️ Deleted empty (likely forwarded) message.");
        return;
      }

      // Delete GIF uploads from device (.gif, .webp, .apng)
      for (const attachment of message.attachments.values()) {
        const name = attachment.name?.toLowerCase();
        if (name && (name.endsWith(".gif") || name.endsWith(".webp") || name.endsWith(".apng"))) {
          await message.delete();
          console.log("🗑️ Deleted uploaded animated file.");
          return;
        }
      }
    }
  } catch (err) {
    console.error("⚠️ Error handling message:", err.message);
  }
});

// Keep-alive webserver for Render/UptimeRobot
const app = express();
app.get("/", (_, res) => res.send("Bot is running!"));

app.listen(3000, () => {
  console.log("🌐 Keep-alive webserver running on port 3000");
});

// Start the bot
client.login(process.env.TOKEN);