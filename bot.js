// bot.js
import { Client, GatewayIntentBits, Events, WebhookClient } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Setup webhook client
const webhook = new WebhookClient({ url: process.env.WEBHOOK_URL });

// Role IDs
const BLOCKED_ROLE_IDS = [
  '1399135278396080238', // First-Time Believer
  '1399992492568350794', // Blessed Cutie
  '1399993506759573616'  // Angel in Training
];

const LEVEL_ROLES = {
  '1399992492568350794': 'Blessed Cutie',        // Level 5
  '1399993506759573616': 'Angel in Training',   // Level 12
  '1399994681970004021': 'Angel with Wings',    // Level 20
  '1399994799334887495': 'Full-Fledged Angel'   // Level 28
};

const LEVEL_MESSAGES = {
  '1399992492568350794': (mention) => `AHHH OMG!!! ${mention}<a:HeartPop:1397425476426797066>\nYou just leveled up to a Blessed Cutie!! 💻<a:PinkHearts:1399307823850065971>\nYou're not flying with the angels yet... but you're definitely glowing with that celestial aesthetic <a:KawaiiBunny_Recolored:1399156026187710560> <a:Flowers:1398259380217970810>\nYou’ve been lightly sprinkled with holy vibes 💦 so keep radiating those good energies~!!<a:Announcement:1397426113931640893>\nMaybe—just maybe—your halo’s loading... 🪽📡\n#BlessedButNotAscended`,

  '1399993506759573616': (mention) => `***A new angel has been born! Welcome to the gates of heaven ${mention}!!!***<a:HeartFlowers:1398261467459096648>\nYou’ve officially been *drafted by Heaven* and are now an **Angel in Training**\nDon’t rush the glow-up, you’re doing great, just keep shining! <a:a_pink_hearts:1399307738923663433>\n#NewAngelVibes #DivineInProgress`,

  '1399994681970004021': (mention) => `***OMG!!! OMG!!! OMG!!! ${mention} just earned their very own wings~!!!***<a:MenheraChanFly:1398259676315123723>\nYou’ve unlocked full celestial privileges — wings, power, and the ability to soar.\n#UnleashTheWings #DivineAscension`,

  '1399994799334887495': (mention) => `<a:HeartPop:1397425476426797066>*** KYAAA!!! OMG!!! OMG!!! OMG!!! ${mention} is now a Full-Fledged Angel!!!***\nYou’ve unlocked EVERYTHING! wings, power, unlimited privileges, and the full might of Heaven’s elite\n#RealAngelVibes #UnlimitedPower #AngelicElite`
};

client.once(Events.ClientReady, () => {
  console.log(`🚀 Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

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

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
  for (const [roleId, role] of addedRoles) {
    if (LEVEL_MESSAGES[roleId]) {
      const mention = `<@${newMember.user.id}>`;
      const message = LEVEL_MESSAGES[roleId](mention);
      try {
        await webhook.send({ content: message });
        console.log(`📨 Sent webhook message for ${newMember.user.tag} (${LEVEL_ROLES[roleId]})`);
      } catch (err) {
        console.error(`❌ Failed to send webhook message:`, err);
      }
    }
  }
});

// Keep-alive webserver
const app = express();
app.get("/", (_, res) => res.send("Bot is running!"));

app.listen(3000, () => {
  console.log("🌐 Keep-alive webserver running on port 3000");
});

client.login(process.env.TOKEN);