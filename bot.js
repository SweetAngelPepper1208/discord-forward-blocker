import { Client, GatewayIntentBits, Events, WebhookClient } from "discord.js";
import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";

// Load .env
dotenv.config();
const {
  DISCORD_TOKEN,
  WEBHOOK_URL,
  LEVEL_UP_CHANNEL,
  PORT = 3000,
  DEBUG_MESSAGES,
} = process.env;

// Debug environment
console.log("✅ Loaded .env file (if present)");
console.log("--- ENV & runtime info ---");
console.log("Node version:", process.version);
console.log("Platform:", process.platform);
console.log("PID:", process.pid);
console.log("PORT (effective):", PORT);
console.log("DISCORD_TOKEN present:", !!DISCORD_TOKEN);
console.log("WEBHOOK_URL present:", !!WEBHOOK_URL);
console.log("LEVEL_UP_CHANNEL present:", !!LEVEL_UP_CHANNEL);
console.log("DEBUG_MESSAGES:", DEBUG_MESSAGES);
console.log("Token length (chars):", DISCORD_TOKEN ? DISCORD_TOKEN.length : "MISSING");

// 🔎 Step 1: Verify token with Discord REST API
(async () => {
  try {
    console.log("🌐 Testing token against Discord REST API...");
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${DISCORD_TOKEN}` },
    });
    if (!res.ok) {
      console.error("❌ Token check failed:", res.status, await res.text());
    } else {
      const data = await res.json();
      console.log("✅ Token is valid. Logged in as:", `${data.username}#${data.discriminator}`, "ID:", data.id);
    }
  } catch (err) {
    console.error("❌ Error testing token:", err);
  }
})();

// 🔎 Step 2: Setup WebhookClient
let webhookClient = null;
if (WEBHOOK_URL) {
  try {
    webhookClient = new WebhookClient({ url: WEBHOOK_URL });
    console.log("✅ WebhookClient created (WEBHOOK_URL provided).");
  } catch (err) {
    console.error("❌ Failed to create WebhookClient:", err);
  }
} else {
  console.warn("⚠️ WEBHOOK_URL not set. Webhook features disabled.");
}

// 🔎 Step 3: Setup Discord Client with ALL intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

console.log("🌐 Attempting Discord login using DISCORD_TOKEN from env...");
client.login(DISCORD_TOKEN).catch((err) => {
  console.error("❌ Discord login failed:", err);
});

// 🔎 Step 4: Events
client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Discord client ready! Logged in as ${readyClient.user.tag} (ID: ${readyClient.user.id})`);
});

client.on("error", (err) => console.error("❌ Client error:", err));
client.on("shardError", (err) => console.error("❌ Shard error:", err));
client.on("invalidated", () => console.error("❌ Client session invalidated!"));

// 🔎 Step 5: Express keep-alive
const app = express();
app.get("/", (req, res) => res.send("Bot is running!"));
app.listen(PORT, () => console.log(`🌐 Express server started on port ${PORT}`));
