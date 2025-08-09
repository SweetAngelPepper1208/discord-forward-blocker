import { Client, GatewayIntentBits, Partials } from 'discord.js';
import express from 'express';

// Only load dotenv locally, not on Render
if (process.env.NODE_ENV !== 'production') {
  import('dotenv').then(dotenv => dotenv.config());
}

// Debug: show if token is detected
console.log("DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "FOUND" : "NOT FOUND");

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error("❌ Missing DISCORD_TOKEN in environment — stopping.");
  process.exit(1);
}

// Keep-alive server for Render
const app = express();
app.get('/', (req, res) => res.send('Bot is alive'));
app.listen(3000, () => console.log("✅ Keep-alive server running on port 3000"));

// Create bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
