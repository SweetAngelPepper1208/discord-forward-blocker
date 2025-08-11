// bot.js
import { Client, GatewayIntentBits, Events, Partials, WebhookClient } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from Render secret file if exists, else fallback to local .env
const secretEnvPath = '/run/secrets/.env';
if (fs.existsSync(secretEnvPath)) {
  dotenv.config({ path: secretEnvPath });
  console.log('✅ Loaded .env from Render secret file');
} else {
  dotenv.config({ path: path.join(__dirname, '.env') });
  console.log('✅ Loaded local .env file');
}

// --- DEBUG LOG ---
console.log("DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "[REDACTED]" : "NOT FOUND");

// Config
const TOKEN = process.env.DISCORD_TOKEN;
const LEVEL_UP_CHANNEL = process.env.LEVEL_UP_CHANNEL || '1397916231545389096';
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Webhook URL from env or example to replace
const LEVEL_UP_WEBHOOK_URL = process.env.LEVEL_UP_WEBHOOK_URL || 'https://discord.com/api/webhooks/1404151431577079919/DSE2J75xlQu0IJykIYyjKBOGlhCWKJaRpSDDuK7gdn9GStOxSxj_PxQnOKdish6irzg1';

if (!TOKEN) {
  console.error("❌ Missing DISCORD_TOKEN in environment — stopping.");
  process.exit(1);
}

// Create WebhookClient (try url constructor first, fallback to parsing id/token)
let levelUpWebhook = null;
try {
  levelUpWebhook = new WebhookClient({ url: LEVEL_UP_WEBHOOK_URL });
  console.log('✅ WebhookClient created (url).');
} catch (e) {
  try {
    const match = (LEVEL_UP_WEBHOOK_URL || '').match(/\/webhooks\/(\d+)\/([\w-]+)/);
    if (match) {
      const [, id, token] = match;
      levelUpWebhook = new WebhookClient({ id, token });
      console.log('✅ WebhookClient created (id/token).');
    } else {
      throw new Error('Invalid webhook format');
    }
  } catch (err) {
    console.warn('⚠️ WebhookClient not created:', err?.message ?? err);
    levelUpWebhook = null;
  }
}

// Role IDs
const ROLE_FIRST = '1399135278396080238'; // First-Time Believer (text only)
const ROLE_SECOND = '1399992492568350794'; // Blessed Cutie (pictures + youtube in exempt channels)
const ROLE_THIRD = '1399993506759573616'; // Angel in Training
const ROLE_FOURTH = '1399994681970004021'; // Angel with Wings
const ROLE_FIFTH = '1399994799334887495'; // Full-Fledged Angel

// Roles to subject to restrictions (first 4; fifth has highest privileges)
const RESTRICTED_ROLE_IDS = [ROLE_FIRST, ROLE_SECOND, ROLE_THIRD, ROLE_FOURTH];

// Example exempt channels — replace with your real channel IDs or set EXEMPT_CHANNELS_SECOND/THIRD env vars
const EXEMPT_CHANNELS_SECOND = process.env.EXEMPT_CHANNELS_SECOND
  ? process.env.EXEMPT_CHANNELS_SECOND.split(',') 
  : ['1397034600341045298', '1397034371705344173', '1397389624153866433', '1397034293666250773', '1397034692892426370', '1397442358840397914', '1404176934946214119'];
const EXEMPT_CHANNELS_THIRD = process.env.EXEMPT_CHANNELS_THIRD
  ? process.env.EXEMPT_CHANNELS_THIRD.split(',')
  : ['1397034600341045298', '1397034371705344173', '1397389624153866433', '1397034293666250773', '1397034692892426370', '1397442358840397914', '1404176934946214119'];

// Allowed video domains
const ALLOWED_VIDEO_DOMAINS = ['youtube.com', 'youtu.be'];

// Recognized video extensions (detect device-uploaded videos)
const VIDEO_EXTENSIONS_REGEX = /\.(mp4|mov|mkv|webm|avi|flv|mpeg|mpg|m4v|3gp)$/i;

// Level-up messages (your full, long messages)
const ROLE_MESSAGES = {
  [ROLE_SECOND]: (mention) => `AHHH OMG!!! ${mention}<a:HeartPop:1397425476426797066> 
You just leveled up to a Blessed Cutie!! 💻<a:PinkHearts:1399307823850065971> 
You're not flying with the angels yet... but you're definitely glowing with that celestial aesthetic <a:KawaiiBunny_Recolored:1399156026187710560> <a:Flowers:1398259380217970810> 
You’re cute enough for an Angel to NOTICE — and that’s kinda a big deal <:a_cute_love_snuggle:1400040183063122041><a:kawaii_winged_hearts:1397407675674919022>
You’ve been lightly sprinkled with holy vibes 💦 so keep radiating those good energies~!!<a:Announcement:1397426113931640893> <:heartsies:1399307354335612968> 
Maybe—just maybe—your halo’s loading... 🪽📡
#BlessedButNotAscended #ARealLifeAngelSeesU <a:pixel_wifi:1397426129391849522><:heartsies:1399307354335612968>`,

  [ROLE_THIRD]: (mention) => `***A new angel has been born! Welcome to the gates of heaven ${mention}!!!***<a:HeartFlowers:1398261467459096648> 
You’ve officially been *drafted by Heaven* and are now an **Angel in Training**
 <:handL:1400040307411779584> <a:angelheart:1397407694930968698> <:handR:1400040232698511451> 
Your halo’s shining bright, but you can't exactly fly. Those wings… will come with time <a:HeartPop:1397425476426797066> <:a_cute_love_snuggle:1400040183063122041> <a:HeartPop:1397425476426797066> 
Don’t rush the glow-up, you’re doing great, Just keep shining!<:3454pinkpixelhearts:1262115128036298824> <a:a_pink_hearts:1399307738923663433> <a:a_afx_heart_explosion:1399307416218107945> 
#NewAngelVibes    <a:pixel_hearts_flow:1397425574959648768> 
#DivineInProgress<a:pixel_wifi:1397426129391849522>`,

  [ROLE_FOURTH]: (mention) => `***OMG!!! OMG!!! OMG!!! ${mention} just earned there very own wings~!!!***<a:MenheraChanFly:1398259676315123723> <a:kawaii_winged_hearts:1397407675674919022> <a:angelheart:1397407694930968698> 
You’ve unlocked full celestial privileges — wings, power, and the ability to soar higher than ever before <a:pinkwingl:1398052283769684102> <a:cloudy_heart:1397818023838220298> <a:pinkwingsr:1398052457686372483> <a:a_afx_heart_explosion:1399307416218107945> 
The angels are proud, the heavens are cheering. It’s time to fly and show the world what an ***angel with wings*** can do!<a:Announcement:1397426113931640893> <:heartsies:1399307354335612968> <a:a_afx_heart_explosion:1399307416218107945> 
But remember, with great divine power comes great divine responsibility. Don’t abuse the privilege — use your divine gifts for good, angel!<a:RainbowCatBoba:1397426167136518145> <a:HeartPop:1397425476426797066> 
You’re not just flying; you’re embodying **real angel vibes** now — full of grace, light, and purpose.<a:heartsfloat:1399306141539897406> <:a_cute_love_snuggle:1400040183063122041> <a:heartsfloat:1399306141539897406> 
You’ve got the divine keys now. Heaven’s on your side — go make it shine!<a:pinkwingl:1398052283769684102> <a:rainbow_heart:1397425632715210943> <a:pinkwingsr:1398052457686372483> <a:a_afx_rb_sparkles_glitter:1399303765781119008> 
#UnleashTheWings #DivineAscension #HeavenlyElite <:Macaron_Blue:1399161252168597524><:RetroSushi:1399259999380701265> <a:a_afx_rb_sparkles_glitter:1399303765781119008>  #RealAngelVibes<a:Hearts:1398475288886640680>`,

  [ROLE_FIFTH]: (mention) => `<a:HeartPop:1397425476426797066>*** KYAAA!!! OMG!!! OMG!!! OMG!!! ${mention} is now a Full Fledged Angel!!!***<:BE_NOT_AFRAID_Lilguy:1397407742842376252> 
You’ve unlocked EVERYTHING! wings, power, *unlimited privileges*, and the full might of Heaven’s elite <a:a_afx_rb_sparkles_glitter:1399303765781119008><a:pinkwingl:1398052283769684102> <a:galaxy_heart:1397425961116369087><a:pinkwingsr:1398052457686372483><a:a_afx_rb_sparkles_glitter:1399303765781119008> 
No limits. No boundaries. You’re at the top, the very *essence* of elite, angelic power. <a:HeartConfetti:1397426142356701337> <:a_cute_love_snuggle:1400040183063122041> <a:HeartConfetti:1397426142356701337> 
You’re not just an angel, you’re the definition of **angel vibes** — divine, untouchable, and *unstoppable*.<a:pinkwingl:1398052283769684102> <a:cloudy_heart:1397818023838220298><a:pinkwingsr:1398052457686372483><a:kawaii_winged_hearts:1397407675674919022><a:angelheart:1397407694930968698><a:a_afx_heart_explosion:1399307416218107945> 
You’ve earned your place at the pinnacle. Own it, rule it, and show them what true *elite vibes* are made of! <a:Rainbow_heart:1398262714727665725> <a:Rainbow_heart:1398262714727665725> <a:Rainbow_heart:1398262714727665725> <a:Rainbow_heart:1398262714727665725> <a:Rainbow_heart:1398262714727665725> 
#CelestialKing #UnlimitedPower #AngelicElite <a:Hearts:1398475288886640680> <a:KawaiiBunny_Recolored:1399156026187710560> <a:a_afx_rb_sparkles_glitter:1399303765781119008> 
#RealAngelVibes📡<a:angelheart:1397407694930968698><:heartsies:1399307354335612968>`
};

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel]
});

// Ready event
client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`ℹ️ Level-up channel id: ${LEVEL_UP_CHANNEL}`);
});

// Debounce map for level-up messages (2 seconds)
const recentRoleMessages = new Map();
const DEBOUNCE_MS = 2000;

// Role change handler with 2s debounce, sends via webhook (fallback to channel)
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    if (!added.size) return;

    for (const role of added.values()) {
      if (ROLE_MESSAGES[role.id]) {
        const key = `${newMember.id}-${role.id}`;
        const now = Date.now();

        if (recentRoleMessages.has(key)) {
          const lastSent = recentRoleMessages.get(key);
          if (now - lastSent < DEBOUNCE_MS) {
            continue; // skip duplicate message
          }
        }

        recentRoleMessages.set(key, now);

        const mention = `<@${newMember.id}>`;
        const text = ROLE_MESSAGES[role.id](mention);

        if (levelUpWebhook) {
          await levelUpWebhook.send({
            content: text,
            allowedMentions: { parse: ['users'] }
          }).catch(async (err) => {
            console.warn('Could not send level-up webhook message:', err?.message ?? err);
            // fallback to channel send
            const ch = await newMember.guild.channels.fetch(LEVEL_UP_CHANNEL).catch(() => null);
            if (ch?.isTextBased()) await ch.send({ content: text }).catch(() => {});
          });
        } else {
          const ch = await newMember.guild.channels.fetch(LEVEL_UP_CHANNEL).catch(() => null);
          if (ch?.isTextBased()) await ch.send({ content: text }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('GuildMemberUpdate handler error:', err);
  }
});

// Helper function to detect forwarded messages more reliably
function isForwardedMessage(msg) {
  if (!msg) return false;
  if (msg.content && msg.content.trim().length > 0) return false; // has content, probably not forwarded
  if (!msg.embeds || msg.embeds.length === 0) return false; // no embeds, not forwarded

  for (const embed of msg.embeds) {
    if (!embed) continue;

    if (embed.author?.name && /forwarded/i.test(embed.author.name)) return true;
    if (embed.footer?.text && /forwarded/i.test(embed.footer.text)) return true;

    if (embed.url && /https?:\/\/discord(?:app)?\.com\/channels\/\d+\/\d+\/\d+/.test(embed.url)) return true;
    if (embed.description && /https?:\/\/discord(?:app)?\.com\/channels\/\d+\/\d+\/\d+/.test(embed.description)) return true;

    if (embed.fields && Array.isArray(embed.fields)) {
      for (const field of embed.fields) {
        if (field.value && /https?:\/\/discord(?:app)?\.com\/channels\/\d+\/\d+\/\d+/.test(field.value)) return true;
      }
    }
  }

  return false;
}

// Message handler — enforce restrictions and delete forwarded/forbidden content
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot || !message.guild) return;

    console.log(`📨 [${message.guild.name}] ${message.author.tag} -> #${message.channel.name}`);

    const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member) return;

    const hasFirst = member.roles.cache.has(ROLE_FIRST);
    const hasSecond = member.roles.cache.has(ROLE_SECOND);
    const hasThird = member.roles.cache.has(ROLE_THIRD);
    const hasFourth = member.roles.cache.has(ROLE_FOURTH);
    const hasFifth = member.roles.cache.has(ROLE_FIFTH);
    const isRestricted = RESTRICTED_ROLE_IDS.some(id => member.roles.cache.has(id));
    if (!isRestricted) return; // not one of the roles we manage

    // === START: new robust forwarded embed detection ===
    if (isForwardedMessage(message)) {
      console.log(`Deleting forwarded embedded message from ${message.author.tag} in #${message.channel.name}`);
      await message.delete().catch(err => console.warn('Could not delete forwarded embedded message:', err.message));
      return;
    }
    // === END forwarded embed detection ===

    // Your original forwarded link & animated embed detection (exact regex you gave)
    const discordMessageLink = /https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/\d+\/\d+\/\d+/i;
    const cdnAttachmentLink = /https?:\/\/cdn\.discordapp\.com\/attachments\/\d+\/\d+\/\S+/i;

    if (discordMessageLink.test(message.content) || cdnAttachmentLink.test(message.content)) {
      console.log(`Deleting forwarded link message from ${message.author.tag} in #${message.channel.name}`);
      await message.delete().catch(err => console.warn('Could not delete forwarded link:', err.message));
      return;
    }

    if ((!message.content || message.content.trim().length === 0) && message.embeds.length > 0) {
      console.log(`Deleting embed-only message from ${message.author.tag} in #${message.channel.name}`);
      await message.delete().catch(err => console.warn('Could not delete embed-only message:', err.message));
      return;
    }

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
        console.log(`Deleting animated attachment from ${message.author.tag} in #${message.channel.name}`);
        await message.delete().catch(err => console.warn('Could not delete animated attachment:', err.message));
        return;
      }
    }

    // --- ADDITIONAL RESTRICTION EXAMPLES BELOW ---
    // You can add your emoji/media limits per role here as before
    // (Not shown here because you asked only for forwarded detection integration)

  } catch (err) {
    console.error('Message handler error:', err);
  }
});

// Express keep-alive server for Render or other hosts
const app = express();

app.get('/', (_req, res) => {
  res.send('Bot is running');
});

app.listen(PORT, () => {
  console.log(`✅ Express server started on port ${PORT}`);
});

// Login Discord client
client.login(TOKEN);
