// bot.js
import { Client, GatewayIntentBits, WebhookClient, Events } from "discord.js";
import express from "express";
import dotenv from "dotenv";

// Load .env if running locally (Render uses dashboard variables)
dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const LEVEL_UP_CHANNEL = process.env.LEVEL_UP_CHANNEL;
const DEBUG_MESSAGES = process.env.DEBUG_MESSAGES === "true";

if (!DISCORD_TOKEN) console.error("❌ DISCORD_TOKEN not set in environment variables");
if (!WEBHOOK_URL) console.error("❌ WEBHOOK_URL not set in environment variables");
if (!LEVEL_UP_CHANNEL) console.error("❌ LEVEL_UP_CHANNEL not set in environment variables");

if (DEBUG_MESSAGES) {
  console.log("🛠 DEBUG: Environment variables check");
  console.log("DISCORD_TOKEN present:", !!DISCORD_TOKEN, "length:", DISCORD_TOKEN?.length);
  console.log("WEBHOOK_URL present:", !!WEBHOOK_URL);
  console.log("LEVEL_UP_CHANNEL:", LEVEL_UP_CHANNEL);
  console.log("DEBUG_MESSAGES:", DEBUG_MESSAGES);
}

// Express server (keep alive on Render)
const app = express();
const PORT = process.env.PORT || 3000; // must use Render's PORT
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(PORT, () => console.log(`🌐 Express server running on port ${PORT}`));

// Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Level-up webhook
const webhook = new WebhookClient({ url: WEBHOOK_URL });
console.log("✅ WebhookClient created.");

// Debug login
if (DEBUG_MESSAGES) console.log("🌐 Attempting Discord login...");

client.once(Events.ClientReady, c => {
  console.log(`✅ Discord bot logged in as ${c.user.tag}`);
});

// Login
client.login(DISCORD_TOKEN).catch(err => {
  console.error("❌ Discord login failed:", err);
});

// Example function to send level-up message
export function sendLevelUp(user, levelName) {
  if (!webhook) return;
  const messages = {
    "Blessed Cutie": `AHHH OMG!!! ${user} <a:HeartPop:1397425476426797066> You just leveled up to a Blessed Cutie!!`,
    "Angel in Training": `***A new angel has been born! Welcome to the gates of heaven ${user}!!!***`,
    "Angel with Wings": `***OMG!!! OMG!!! OMG!!! ${user} just earned their very own wings~!!!***`,
    "Full-Fledged Angel": `<a:HeartPop:1397425476426797066>*** KYAAA!!! OMG!!! OMG!!! OMG!!! ${user} is now a Full Fledged Angel!!!***`
  };
  const msg = messages[levelName] || `${user} leveled up to ${levelName}!`;

  webhook.send({
    content: msg,
    username: "Level-Up Bot",
    avatarURL: "https://i.imgur.com/yourAvatar.png" // optional
  }).then(() => {
    if (DEBUG_MESSAGES) console.log(`✅ Sent level-up message for ${user}: ${levelName}`);
  }).catch(err => console.error("❌ Failed to send level-up message:", err));
}
