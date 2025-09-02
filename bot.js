// bot.js
import { Client, GatewayIntentBits, Partials } from "discord.js";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname for dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
console.log("🟡 Loading .env file...");
const envResult = dotenv.config({ path: path.join(__dirname, ".env") });

if (envResult.error) {
  console.error("❌ Failed to load .env file:", envResult.error);
} else {
  console.log("✅ .env file loaded successfully");
}

// Env vars
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
const LEVEL_UP_CHANNEL = process.env.LEVEL_UP_CHANNEL || "";
const PORT = process.env.PORT || 3000;
const DEBUG_MESSAGES = process.env.DEBUG_MESSAGES === "true";

// Debug env check
console.log("🟡 Environment variables check:");
console.log("DISCORD_TOKEN:", DISCORD_TOKEN ? `✅ length ${DISCORD_TOKEN.length}` : "❌ MISSING");
console.log("WEBHOOK_URL:", WEBHOOK_URL ? "✅ found" : "⚠️ empty");
console.log("LEVEL_UP_CHANNEL:", LEVEL_UP_CHANNEL || "⚠️ empty");
console.log("PORT:", PORT);
console.log("DEBUG_MESSAGES:", DEBUG_MESSAGES);

// Stop if missing token
if (!DISCORD_TOKEN) {
  console.error("❌ No DISCORD_TOKEN found. Cannot continue.");
  process.exit(1);
}

// Init client
console.log("🟡 Initializing Discord client...");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Core events
client.once("ready", () => {
  console.log("✅ Bot logged in successfully!");
  console.log(`🤖 Logged in as: ${client.user.tag} (ID: ${client.user.id})`);
});

// Debugging & errors
client.on("error", (err) => console.error("❌ Client error:", err));
client.on("warn", (info) => console.warn("⚠️ Warning:", info));
client.on("shardError", (err) => console.error("❌ Shard error:", err));
client.on("invalidated", () => console.error("❌ Client session invalidated! Reconnect needed."));
client.on("rateLimit", (info) => console.warn("⏱️ Rate limit hit:", info));
client.on("debug", (msg) => console.log("🔍 Debug:", msg));

// Message logger if enabled
if (DEBUG_MESSAGES) {
  client.on("messageCreate", (msg) => {
    console.log(`💬 [${msg.guild?.name || "DM"}] #${msg.channel?.name || "?"} | ${msg.author.tag}: ${msg.content}`);
  });
}

// Express keep-alive
const app = express();
app.get("/", (req, res) => res.send("✅ Bot is running"));
app.listen(PORT, () => {
  console.log(`🌐 Express server running on port ${PORT}`);
});

// Attempt login
console.log("🟡 Attempting Discord login...");
client.login(DISCORD_TOKEN).catch((err) => {
  console.error("❌ Login failed:", err);
});
