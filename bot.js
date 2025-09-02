// bot.js
import { Client, GatewayIntentBits, WebhookClient, Events } from "discord.js";
import express from "express";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();
console.log("✅ Loaded .env file");

// --- Check environment variables ---
console.log("🛠 DEBUG: Environment variables check");
console.log("DISCORD_TOKEN exists:", !!process.env.DISCORD_TOKEN);
console.log("LEVEL_UP_CHANNEL exists:", !!process.env.LEVEL_UP_CHANNEL);
console.log("LEVEL_UP_WEBHOOK_URL exists:", !!process.env.LEVEL_UP_WEBHOOK_URL);
console.log("DEBUG_MESSAGES:", process.env.DEBUG_MESSAGES);
if (process.env.DISCORD_TOKEN) {
  console.log(
    "Token length check (should be ~59–72):",
    process.env.DISCORD_TOKEN.length
  );
}

// --- Create Webhook Client ---
let webhookClient;
if (process.env.LEVEL_UP_WEBHOOK_URL) {
  try {
    webhookClient = new WebhookClient({
      url: process.env.LEVEL_UP_WEBHOOK_URL,
    });
    console.log("✅ WebhookClient created.");
  } catch (err) {
    console.error("❌ Failed to create WebhookClient:", err);
  }
} else {
  console.error("❌ LEVEL_UP_WEBHOOK_URL not set in .env");
}

// --- Create Discord Client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --- Login the bot ---
console.log("🌐 Attempting Discord login...");

client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log("✅ Login successful, waiting for 'ready'...");
  })
  .catch((error) => {
    console.error("❌ Discord login failed:", error);
    process.exit(1); // exit so Render shows failed deploy instead of hanging
  });

// --- On ready ---
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// --- Simulated Level Up Listener ---
// Replace with your XP/level system integration
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  if (content.includes("!level5")) {
    await webhookClient.send(
      `AHHH OMG!!! ${message.author}<a:HeartPop:1397425476426797066> You just leveled up to a Blessed Cutie!!`
    );
  }

  if (content.includes("!level12")) {
    await webhookClient.send(
      `***A new angel has been born! Welcome to the gates of heaven ${message.author}!!!***`
    );
  }

  if (content.includes("!level20")) {
    await webhookClient.send(
      `***OMG!!! OMG!!! OMG!!! ${message.author} just earned there very own wings~!!!***`
    );
  }

  if (content.includes("!level28")) {
    await webhookClient.send(
      `<a:HeartPop:1397425476426797066>*** KYAAA!!! OMG!!! OMG!!! OMG!!! ${message.author} is now a Full Fledged Angel!!!***`
    );
  }
});

// --- Express Keep-Alive Server ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Bot is running."));
app.listen(PORT, () =>
  console.log(`🌐 Express server started on port ${PORT}`)
);
