import { Client, GatewayIntentBits, Events } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// --- DEBUG LOG for DISCORD_TOKEN ---
console.log('DISCORD_TOKEN:', !!process.env.DISCORD_TOKEN ? '[REDACTED]' : 'NOT FOUND');

// --- config ---
const TOKEN = process.env.DISCORD_TOKEN;
const LEVEL_UP_CHANNEL = process.env.LEVEL_UP_CHANNEL || '1397916231545389096';
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

if (!TOKEN) {
  console.error('❌ Missing DISCORD_TOKEN in environment — stopping.');
  process.exit(1);
}

// Roles that are still restricted (levels 0,5,12)
const RESTRICTED_ROLE_IDS = [
  '1399135278396080238', // First-Time Believer
  '1399992492568350794', // Blessed Cutie
  '1399993506759573616'  // Angel in Training
];

// Level-up messages (you can paste the long messages here)
const ROLE_MESSAGES = {
  "1399992492568350794": (mention) => `AHHH OMG!!! ${mention}<a:HeartPop:1397425476426797066> 
You just leveled up to a Blessed Cutie!! 💻<a:PinkHearts:1399307823850065971>
You're not flying with the angels yet... but you're definitely glowing with that celestial aesthetic...`,

  "1399993506759573616": (mention) => `***A new angel has been born! Welcome to the gates of heaven ${mention}!!!***<a:HeartFlowers:1398261467459096648>
You’ve officially been *drafted by Heaven* and are now an **Angel in Training**...`,

  "1399994681970004021": (mention) => `***OMG!!! OMG!!! OMG!!! ${mention} just earned their very own wings~!!!***<a:MenheraChanFly:1398259676315123723>
You’ve unlocked full celestial privileges — wings, power, and the ability to soar...`,

  "1399994799334887495": (mention) => `<a:HeartPop:1397425476426797066>*** KYAAA!!! OMG!!! ${mention} is now a Full Fledged Angel!!!*** 
You’ve unlocked EVERYTHING! wings, power, unlimited privileges...`
};
// --------------------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ready
client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`ℹ️ Level-up channel id: ${LEVEL_UP_CHANNEL}`);
});

// ---------- MESSAGE HANDLER ----------
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot || !message.guild) return;

    // debug log
    console.log(`📨 [${message.guild.name}] ${message.author.tag} -> #${message.channel.name} | contentLen=${(message.content||'').length} embeds=${message.embeds.length} attachments=${message.attachments.size}`);

    // resolve guild member
    const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member) return;

    const isRestricted = RESTRICTED_ROLE_IDS.some(id => member.roles.cache.has(id));
    if (!isRestricted) return; // only enforce on restricted roles

    // regexes for forwarded/attachment links
    const discordMessageLink = /https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/\d+\/\d+\/\d+/i;
    const cdnAttachmentLink = /https?:\/\/cdn\.discordapp\.com\/attachments\/\d+\/\d+\/\S+/i;

    // 1) explicit forwarded message links or cdn links in content
    if (discordMessageLink.test(message.content) || cdnAttachmentLink.test(message.content)) {
      await message.delete().catch(err => console.warn('Could not delete forwarded link:', err.message));
      console.log('🗑️ Deleted forwarded link message:', message.id);
      return;
    }

    // 2) embed-only messages (common forwarded style: empty content + embed(s))
    if ((!message.content || message.content.trim().length === 0) && message.embeds.length > 0) {
      await message.delete().catch(err => console.warn('Could not delete embed-only forwarded message:', err.message));
      console.log('🗑️ Deleted embed-only forwarded message:', message.id);
      return;
    }

    // 3) device-uploaded animated attachments (.gif, .webp, .apng)
    for (const attachment of message.attachments.values()) {
      const name = (attachment.name || '').toLowerCase();
      const ct = (attachment.contentType || '').toLowerCase();
      if (
        name.endsWith('.gif') ||
        name.endsWith('.webp') ||
        name.endsWith('.apng') ||
        ct.startsWith('image/gif') ||
        ct.includes('webp') ||
        ct.includes('apng')
      ) {
        await message.delete().catch(err => console.warn('Could not delete animated attachment:', err.message));
        console.log('🗑️ Deleted animated attachment message:', message.id, 'attachment:', attachment.url);
        return;
      }
    }

    // otherwise do nothing
  } catch (err) {
    console.error('Message handler error:', err);
  }
});

// ---------- ROLE CHANGE (level-up) HANDLER ----------
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    // compute newly added roles
    const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    if (!added.size) return;

    for (const role of added.values()) {
      if (ROLE_MESSAGES[role.id]) {
        const mention = `<@${newMember.id}>`;
        const text = ROLE_MESSAGES[role.id](mention);
        // fetch channel and send
        const ch = await newMember.guild.channels.fetch(LEVEL_UP_CHANNEL).catch(() => null);
        if (ch && ch.isTextBased && ch.isTextBased()) {
          await ch.send({ content: text }).catch(err => console.warn('Could not send level-up message:', err.message));
          console.log(`📣 Sent level-up message for ${newMember.user.tag} (role ${role.name})`);
        } else {
          console.warn('Level-up channel not found / not text-based:', LEVEL_UP_CHANNEL);
        }
      }
    }
  } catch (err) {
    console.error('GuildMemberUpdate handler error:', err);
  }
});

// ---------- keepalive webserver ----------
const app = express();
app.get('/', (_, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`🌐 Keep-alive server listening on port ${PORT}`));

// login
client.login(TOKEN).catch(err => {
  console.error('❌ client.login failed:', err?.message ?? err);
  process.exit(1);
});