import { Client, GatewayIntentBits, Events } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
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
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.forwarded) return;

  const member = await message.guild.members.fetch(message.author.id);
  const hasBlockedRole = BLOCKED_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));

  if (hasBlockedRole) {
    try {
      await message.delete();
      await message.author.send(
        "🚫 Forwarded messages are blocked for your role. Keep chatting and ranking up to unlock this power!"
      );
    } catch (err) {
      console.error("Failed to delete or DM:", err.message);
    }
  }
});

client.login(process.env.TOKEN);
// Keep-alive server for Replit
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(3000, () => console.log('Express server is running.'));
