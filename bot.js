// bot.js
import {
  Client,
  GatewayIntentBits,
  Events,
  Partials,
  WebhookClient,
} from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------- Resolve __dirname / __filename ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Load environment (.env from secret or local) ----------
const secretEnvPath = '/run/secrets/.env';
if (fs.existsSync(secretEnvPath)) {
  dotenv.config({ path: secretEnvPath });
  console.log('✅ Loaded .env from Render secret file');
} else {
  dotenv.config({ path: path.join(__dirname, '.env') });
  console.log('✅ Loaded local .env file');
}

console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? '[REDACTED]' : 'NOT FOUND');

// ---------- Config ----------
const TOKEN = process.env.DISCORD_TOKEN;
const LEVEL_UP_CHANNEL = process.env.LEVEL_UP_CHANNEL || '1397916231545389096';
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const LEVEL_UP_WEBHOOK_URL =
  process.env.LEVEL_UP_WEBHOOK_URL ||
  'https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz';

// Optional: toggle very-verbose logs via env
const DEBUG_LOGS = (process.env.DEBUG_LOGS || 'true').toLowerCase() === 'true';

if (!TOKEN) {
  console.error('❌ Missing DISCORD_TOKEN in environment — stopping.');
  process.exit(1);
}

// ---------- Create WebhookClient (url or id/token) ----------
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

// ---------- Role IDs ----------
const ROLE_FIRST = '1399135278396080238';   // First-Time Believer (text only)
const ROLE_SECOND = '1399992492568350794';  // Blessed Cutie (pictures + youtube in exempt channels)
const ROLE_THIRD = '1399993506759573616';   // Angel in Training (pics + youtube + tenor anywhere)
const ROLE_FOURTH = '1399994681970004021';  // Angel with Wings
const ROLE_FIFTH = '1399994799334887495';   // Full-Fledged Angel
const ROLE_SIXTH = '1399999195309408320';   // silenced by heaven

// Roles subject to restrictions (first 4; fifth has highest privileges)
const RESTRICTED_ROLE_IDS = [ROLE_FIRST, ROLE_SECOND, ROLE_THIRD, ROLE_FOURTH];

// ---------- Exempt channels (Blessed Cutie / Angel in Training lists) ----------
const EXEMPT_CHANNELS_SECOND = process.env.EXEMPT_CHANNELS_SECOND
  ? process.env.EXEMPT_CHANNELS_SECOND.split(',')
  : [
      '1397034600341045298',
      '1397034371705344173',
      '1397389624153866433',
      '1397034293666250773',
      '1397034692892426370',
      '1397442358840397914',
      '1404176934946214119',
    ];

const EXEMPT_CHANNELS_THIRD = process.env.EXEMPT_CHANNELS_THIRD
  ? process.env.EXEMPT_CHANNELS_THIRD.split(',')
  : [
      '1397034600341045298',
      '1397034371705344173',
      '1397389624153866433',
      '1397034293666250773',
      '1397034692892426370',
      '1397442358840397914',
      '1404176934946214119',
    ];

// ---------- Allowed domains / file-extension helpers ----------
const ALLOWED_VIDEO_DOMAINS = ['youtube.com', 'youtu.be', 'tenor.com']; // (kept for completeness)
const VIDEO_EXTENSIONS_REGEX = /\.(mp4|mov|mkv|webm|avi|flv|mpeg|mpg|m4v|3gp)$/i;

// ---------- Level-up messages ----------
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
You’re not just an angel, you’re the definition of **angel vibes** — divine, untouchable, and *unstoppable*.<a:pinkwingl:1398052283764102> <a:cloudy_heart:1397818023838220298><a:pinkwingsr:1398052457686372483><a:kawaii_winged_hearts:1397407675674919022><a:angelheart:1397407694930968698><a:a_afx_heart_explosion:1399307416218107945> 
You’ve earned your place at the pinnacle. Own it, rule it, and show them what true *elite vibes* are made of! <a:Rainbow_heart:1398262714727665725> <a:Rainbow_heart:1398262714727665725> <a:Rainbow_heart:1398262714727665725> <a:Rainbow_heart:1398262714727665725> <a:Rainbow_heart:1398262714727665725> 
#CelestialKing #UnlimitedPower #AngelicElite <a:Hearts:1398475288886640680> <a:KawaiiBunny_Recolored:1399156026187710560> <a:a_afx_rb_sparkles_glitter:1399303765781119008> 
#RealAngelVibes📡<a:angelheart:1397407694930968698><:heartsies:1399307354335612968>`,

  [ROLE_SIXTH]: (mention) => `***☁️<a:cloudy_heart:1397818023838220298>Message from Heaven<a:cloudy_heart:1397818023838220298>☁️ ***
${mention} you have sinned. You have been silenced.
Heaven has no place for noisy little sinners like you right now.<a:Chika_whack_whack_whack_FB:1399306320745857045> <a:a_anger:1399306470192840805> 
Be grateful you're only muted and not cast out entirely, okay~? <:a_cute_love_snuggle:1400040183063122041> <:heartsies:1399307354335612968> 
Sit there in your divine timeout and reflect on what you’ve done.<:handL:1400040307411779584> <a:angelheart:1397407694930968698> <:handR:1400040232698511451> 
You’ll sit quietly, stripped of your voice, and watch from the digital void unable to interact with the other angels. 🔇 
If redemption is in your future, perhaps your voice will be returned to you 
Until then…<a:pinkwingl:1398052283769684102> <:Angry_Angel:1397425835551752253> <a:pinkwingsr:1398052457686372483> 
**Repent in silence. And remember who showed you mercy.**<a:bloodybrokenheart:1399305645647331399> <a:brokenheart_black:1399305730452099113> 
#RepentAndWatch<:RetroGameOverLaptop:1397449586142089236> 
#MutedByTheDivine<a:MuteButton:1397425770980315176> 
#AngelSeesAll<a:angelheart:1397407694930968698><a:kawaii_winged_hearts:1397407675674919022> 
#YouShouldBeGrateful<:sad_angel:1397425823077892201>`,
};

// ---------- Create Discord client ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// ---------- Extra process-level debug ----------
process.on('unhandledRejection', (reason) => {
  console.error('🧨 UnhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('💥 UncaughtException:', err);
});

// ---------- Ready event ----------
let readyFired = false;
client.once(Events.ClientReady, () => {
  readyFired = true;
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`ℹ️ Level-up channel id: ${LEVEL_UP_CHANNEL}`);
});

// Watchdog in case login stalls
setTimeout(() => {
  if (!readyFired) {
    console.warn('⏳ Bot not ready after 30s. Check token, intents, privileged access, or gateway reachability.');
  }
}, 30000);

// ---------- Debounce for role messages ----------
const recentRoleMessages = new Map();
const DEBOUNCE_MS = 2000;

// ---------- Role change handler (debounced, webhook first, fallback to channel) ----------
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    const added = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
    if (!added.size) return;

    for (const role of added.values()) {
      if (ROLE_MESSAGES[role.id]) {
        const key = `${newMember.id}-${role.id}`;
        const now = Date.now();

        if (recentRoleMessages.has(key)) {
          const lastSent = recentRoleMessages.get(key);
          if (now - lastSent < DEBOUNCE_MS) {
            if (DEBUG_LOGS) console.log(`🟨 Debounced role message for ${newMember.user.tag} role=${role.id}`);
            continue;
          }
        }

        recentRoleMessages.set(key, now);

        const mention = `<@${newMember.id}>`;
        const text = ROLE_MESSAGES[role.id](mention);

        if (DEBUG_LOGS) console.log(`📣 Sending role-up message for ${newMember.user.tag} role=${role.id}`);

        if (levelUpWebhook) {
          await levelUpWebhook
            .send({
              content: text,
              allowedMentions: { parse: ['users'] },
            })
            .catch(async (err) => {
              console.warn('Could not send level-up webhook message:', err?.message ?? err);
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

// ---------- Message moderation helper regex ----------
const DISCORD_MESSAGE_LINK = /https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/\d+\/\d+\/\d+/i;
const CDN_ATTACHMENT_LINK = /https?:\/\/cdn\.discordapp\.com\/attachments\/\d+\/\d+\/\S+/i;

const GENERAL_LINK = /(https?:\/\/[^\s]+)/i;
const YOUTUBE_LINK = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/\S+/i;
const TENOR_LINK = /(https?:\/\/)?(www\.)?tenor\.com\/\S+/i;

function isForwardedMessage(msg) {
  const content = (msg.content || '').trim();
  const hasMsgLink = DISCORD_MESSAGE_LINK.test(content);
  const hasCdnLink = CDN_ATTACHMENT_LINK.test(content);
  const stripped = content.replace(DISCORD_MESSAGE_LINK, '').replace(CDN_ATTACHMENT_LINK, '').trim();
  const isOnlyLink = (hasMsgLink || hasCdnLink) && stripped.length === 0;

  // Detect Discord links inside embeds
  const embedsContainDiscord = msg.embeds?.some((e) => {
    const fields = [
      e.url,
      e.description,
      e.title,
      e.footer?.text,
      e.author?.url,
      e.author?.name,
    ]
      .filter(Boolean)
      .join(' ');
    return DISCORD_MESSAGE_LINK.test(fields) || CDN_ATTACHMENT_LINK.test(fields);
  });

  // Allow normal replies that include additional text
  const isReply = !!msg.reference;
  const hasExtraTextInReply = isReply && content.length > 0 && !isOnlyLink;

  if (hasExtraTextInReply) return false;
  return isOnlyLink || embedsContainDiscord;
}

function hasAnimatedAttachment(msg) {
  for (const attachment of msg.attachments.values()) {
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
      return true;
    }
  }
  return false;
}

function hasDeviceVideoAttachment(msg) {
  for (const att of msg.attachments.values()) {
    const name = (att.name || '').toLowerCase();
    const ct = (att.contentType || '').toLowerCase();
    if (VIDEO_EXTENSIONS_REGEX.test(name) || ct.startsWith('video/')) {
      return true;
    }
  }
  return false;
}

// ---------- Message handler (all original rules preserved) ----------
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot || !message.guild) return;

    // Ensure we have the member object
    const member =
      message.member || (await message.guild.members.fetch(message.author.id).catch(() => null));
    if (!member) return;

    const hasFirst = member.roles.cache.has(ROLE_FIRST);
    const hasSecond = member.roles.cache.has(ROLE_SECOND);
    const hasThird = member.roles.cache.has(ROLE_THIRD);
    const hasFourth = member.roles.cache.has(ROLE_FOURTH);
    const hasFifth = member.roles.cache.has(ROLE_FIFTH);
    const isRestricted = RESTRICTED_ROLE_IDS.some((id) => member.roles.cache.has(id));

    if (DEBUG_LOGS) {
      console.log(
        `📩 ${member.user.tag} (${message.id}) #${message.channel.id} | roles: ` +
          `1:${hasFirst} 2:${hasSecond} 3:${hasThird} 4:${hasFourth} 5:${hasFifth} | content: "${message.content || '[no text]'}"`
      );
    }

    // ---- Strict forwarded/embed-only/empty blocking for restricted roles (kept) ----
    const isEmpty =
      (!message.content || message.content.trim() === '') &&
      message.attachments.size === 0 &&
      message.embeds.length === 0;

    const isEmbedOnly =
      (!message.content || message.content.trim() === '') &&
      message.attachments.size === 0 &&
      message.embeds.length > 0;

    if (isRestricted) {
      if (isForwardedMessage(message)) {
        if (DEBUG_LOGS) console.log('🚫 Delete: forwarded message detected');
        await message.delete().catch((err) =>
          console.warn('Could not delete forwarded message:', err?.message ?? err)
        );
        return;
      }
      if (isEmpty || isEmbedOnly) {
        if (DEBUG_LOGS) console.log('🚫 Delete: empty or embed-only message');
        await message.delete().catch((err) =>
          console.warn('Could not delete empty/embed-only message:', err?.message ?? err)
        );
        return;
      }
    }

    // Pre-calc link booleans
    const content = message.content || '';
    const hasAnyLink = GENERAL_LINK.test(content);
    const isYoutubeLink = YOUTUBE_LINK.test(content);
    const isTenorLink = TENOR_LINK.test(content);

    const animated = hasAnimatedAttachment(message);
    const deviceVideo = hasDeviceVideoAttachment(message);
    const animatedOrVideo = animated || deviceVideo;

    // ---- Per-role rules (original behavior) ----

    // 1) First-Time Believer: NO images, NO links anywhere
    if (hasFirst) {
      if (message.attachments.size > 0 || hasAnyLink) {
        if (DEBUG_LOGS) console.log('🚫 Delete (ROLE_FIRST): attachments or any link');
        await message.delete().catch(() => {});
        return;
      }
    }

    // 2) Blessed Cutie: pics + YouTube links only in exempt channels
    if (hasSecond && !hasThird) {
      const inExempt = EXEMPT_CHANNELS_SECOND.includes(message.channel.id);

      if (!inExempt) {
        if (message.attachments.size > 0 || hasAnyLink) {
          if (DEBUG_LOGS) console.log('🚫 Delete (ROLE_SECOND non-exempt): attachments or any link');
          await message.delete().catch(() => {});
          return;
        }
      } else {
        // Inside exempt: allow pictures + YouTube links only (no animated gifs/videos)
        if (animatedOrVideo) {
          if (DEBUG_LOGS) console.log('🚫 Delete (ROLE_SECOND exempt): animated or device video');
          await message.delete().catch(() => {});
          return;
        }
        if (hasAnyLink && !isYoutubeLink) {
          if (DEBUG_LOGS) console.log('🚫 Delete (ROLE_SECOND exempt): non-YouTube link');
          await message.delete().catch(() => {});
          return;
        }
      }
      return;
    }

    // 3) Angel in Training: pics + YouTube + Tenor GIF links anywhere (no animated/device-uploaded attachments)
    if (hasThird && !hasFourth) {
      if (animatedOrVideo) {
        if (DEBUG_LOGS) console.log('🚫 Delete (ROLE_THIRD): animated or device video attachment');
        await message.delete().catch(() => {});
        return;
      }
      if (hasAnyLink && !isYoutubeLink && !isTenorLink) {
        if (DEBUG_LOGS) console.log('🚫 Delete (ROLE_THIRD): non-YouTube/Tenor link');
        await message.delete().catch(() => {});
        return;
      }
      return;
    }

    // 4) Angel with Wings: pics + YouTube + Tenor + other links anywhere, no device video uploads (also block animated images as before)
    if (hasFourth && !hasFifth) {
      if (animatedOrVideo) {
        if (DEBUG_LOGS) console.log('🚫 Delete (ROLE_FOURTH): animated or device video attachment');
        await message.delete().catch(() => {});
        return;
      }
      // all links allowed
      return;
    }

    // 5) Full-Fledged Angel: no restrictions
    if (hasFifth) {
      if (DEBUG_LOGS) console.log('✅ (ROLE_FIFTH): no restrictions applied');
      return;
    }

    // ROLE_SIXTH has no additional message restrictions here (kept as-is)

  } catch (err) {
    console.error('MessageCreate handler error:', err);
  }
});

// ---------- Express keep-alive server ----------
const app = express();
app.get('/', (req, res) => {
  res.send('Angel bot alive!');
});
app.listen(PORT, () => {
  console.log(`🌐 Express server started on port ${PORT}`);
});

// ---------- Login the client ----------
console.log('✅ Starting bot...');
console.log(`✅ DISCORD_TOKEN found, length: ${TOKEN.length}`);
console.log('Attempting login...');
client.login(TOKEN).catch((err) => {
  console.error('Discord login failed:', err);
  process.exit(1);
});