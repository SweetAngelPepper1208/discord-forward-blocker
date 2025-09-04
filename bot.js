// bot.js
import {
  Client,
  GatewayIntentBits,
  Events,
  Partials,
  Options,
} from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Load .env from Render secret file if exists, else fallback to local .env ----------
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
const DEBUG_MESSAGES = (process.env.DEBUG_MESSAGES || 'false').toLowerCase() === 'true';

if (!TOKEN) {
  console.error('❌ Missing DISCORD_TOKEN in environment — stopping.');
  process.exit(1);
}

// ---------- Role IDs ----------
const ROLE_FIRST = '1399135278396080238'; // First-Time Believer (text only)
const ROLE_SECOND = '1399992492568350794'; // Blessed Cutie
const ROLE_THIRD = '1399993506759573616'; // Angel in Training
const ROLE_FOURTH = '1399994681970004021'; // Angel with Wings
const ROLE_FIFTH = '1399994799334887495'; // Full-Fledged Angel
const ROLE_SIXTH = '1399999195309408320'; // silenced by heaven

// ---------- Full level-up messages (unchanged from your input) ----------
const ROLE_MESSAGES = {
  [ROLE_FIRST]: (mention) =>
    `Welcome ${mention} to the server! 🌸 You’ve just become a **First-Time Believer**! Take your first steps into heaven! ✨`,

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

  [ROLE_SIXTH]: (mention) => `***☁️<a:cloudy_heart:1397818023838220298>Message from Heaven<a:cloudy_heart:139781623...>☁️ ***
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

// ---------- Debounce map ----------
const recentRoleMessages = new Map();
const DEBOUNCE_MS = 2000;

// ---------- Create lightweight Discord client ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel],
  makeCache: Options.cacheWithLimits({
    MessageManager: 0,
    ReactionManager: 0,
    ThreadMemberManager: 0,
    GuildMemberManager: 200,
  }),
});

// ---------- Role change handler (debounced) ----------
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
            if (DEBUG_MESSAGES) console.log(`🟨 Debounced role message for ${newMember.user.tag} role=${role.id}`);
            continue;
          }
        }

        recentRoleMessages.set(key, now);

        const mention = `<@${newMember.id}>`;
        const text = ROLE_MESSAGES[role.id](mention);

        const ch = await newMember.guild.channels.fetch(LEVEL_UP_CHANNEL).catch(() => null);
        if (ch?.isTextBased()) await ch.send({ content: text, allowedMentions: { parse: ['users'] } }).catch(() => {});

      }
    }
  } catch (err) {
    console.error('GuildMemberUpdate handler error:', err);
  }
});

// ---------- Express keep-alive ----------
const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(PORT, () => console.log(`✅ Express server listening on port ${PORT}`));

// ---------- Debugged login section ----------
console.log("✅ Starting bot...");

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing! Did you set it in Render environment variables?");
} else {
  console.log("✅ DISCORD_TOKEN found, length:", TOKEN.length);
  console.log("Attempting login...");
}

client.on('error', (err) => {
  console.error('Client error:', err);
});
client.on('warn', (info) => {
  console.warn('Client warning:', info);
});
client.on('shardError', (err) => {
  console.error('Shard error:', err);
});
client.on('disconnect', (event) => {
  console.warn('Client disconnected:', event);
});

client.login(TOKEN)
  .then(() => {
    console.log('✅ Login request sent (awaiting ready event).');
  })
  .catch((err) => {
    console.error('❌ Login failed (rejected promise):', err);
    if (err && err.code) console.error('Error code:', err.code);
    if (err && err.message) console.error('Error message:', err.message);
  });
