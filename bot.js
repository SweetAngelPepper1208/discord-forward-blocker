// bot.js - role-detect only, sends full messages to a specific channel
import fs from 'fs';
import path from 'path';
import express from 'express';
import { Client, GatewayIntentBits, Events, Options } from 'discord.js';

// ---------- secrets loader (Render / local / env) ----------
function readSecret(name) {
  const renderPath = path.join('/etc/secrets', name);
  const localPath = path.join('./secrets', name);
  if (fs.existsSync(renderPath)) return fs.readFileSync(renderPath, 'utf8').trim();
  if (fs.existsSync(localPath)) return fs.readFileSync(localPath, 'utf8').trim();
  return process.env[name];
}

const DISCORD_TOKEN = readSecret('DISCORD_TOKEN');
const PORT = process.env.PORT || Number(readSecret('PORT')) || 3000;
const DEBUG = (readSecret('DEBUG_MESSAGES') || process.env.DEBUG_MESSAGES || 'false').toLowerCase() === 'true';

// Use the channel ID you supplied, but allow override via secret/env if desired
const DEFAULT_LEVEL_UP_CHANNEL = '1397916231545389096';
const LEVEL_UP_CHANNEL = readSecret('LEVEL_UP_CHANNEL') || DEFAULT_LEVEL_UP_CHANNEL;

console.log('--- startup ---');
console.log('DISCORD_TOKEN present:', !!DISCORD_TOKEN);
console.log('LEVEL_UP_CHANNEL:', LEVEL_UP_CHANNEL);
console.log('PORT:', PORT);
console.log('DEBUG:', DEBUG);

// ---------- role IDs ----------
const ROLE_FIRST  = '1399135278396080238'; // First-Time Believer
const ROLE_SECOND = '1399992492568350794'; // Blessed Cutie
const ROLE_THIRD  = '1399993506759573616'; // Angel in Training
const ROLE_FOURTH = '1399994681970004021'; // Angel with Wings
const ROLE_FIFTH  = '1399994799334887495'; // Full-Fledged Angel
const ROLE_SIXTH  = '1399999195309408320'; // silenced by heaven

// ---------- full messages (exact content you provided) ----------
const ROLE_MESSAGES = {
  [ROLE_FIRST]: (mention) => `Welcome ${mention} to the server! 🌸 You’ve just become a **First-Time Believer**! Take your first steps into heaven! ✨`,

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

// ---------- debounce map ----------
const roleCooldown = new Map();
const DEBOUNCE_TIME = 5000; // 5 seconds

// ---------- create client ----------
if (!DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN missing. Set it in env/secrets and redeploy.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  makeCache: Options.cacheWithLimits({
    MessageManager: 0,
    ReactionManager: 0,
    ThreadMemberManager: 0,
    GuildMemberManager: 200,
  }),
});

// ---------- helper: send to configured channel ----------
async function sendToLevelChannel(guild, text) {
  try {
    const ch = await guild.channels.fetch(LEVEL_UP_CHANNEL).catch(() => null);
    if (!ch) {
      console.warn('⚠️ Level channel not found:', LEVEL_UP_CHANNEL);
      return;
    }
    // ensure text-based
    if (typeof ch.isTextBased === 'function' ? ch.isTextBased() : ch.isText) {
      await ch.send({ content: text, allowedMentions: { parse: ['users'] } });
      DEBUG && console.log('📤 Sent level-up to channel', LEVEL_UP_CHANNEL);
    } else {
      console.warn('⚠️ Level channel is not text-based:', LEVEL_UP_CHANNEL);
    }
  } catch (err) {
    console.error('❌ Error sending to level channel:', err);
  }
}

// ---------- role update handler ----------
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    if (!addedRoles.size) return;

    for (const role of addedRoles.values()) {
      if (!ROLE_MESSAGES[role.id]) continue;

      const key = `${newMember.id}-${role.id}`;
      const now = Date.now();
      const until = roleCooldown.get(key) || 0;
      if (now < until) {
        DEBUG && console.log('➖ Debounced', key);
        continue;
      }
      roleCooldown.set(key, now + DEBOUNCE_TIME);

      const mention = `<@${newMember.id}>`;
      const text = ROLE_MESSAGES[role.id](mention);

      // send to the configured channel
      await sendToLevelChannel(newMember.guild, text);
    }
  } catch (err) {
    console.error('❌ Error in GuildMemberUpdate handler:', err);
  }
});

// ---------- login & keepalive ----------
const app = express();
app.get('/', (_, res) => res.send('Bot is alive.'));
app.listen(PORT, () => console.log(`🌐 Express listening on ${PORT}`));

client.once(Events.ClientReady, c => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

console.log('🌐 Attempting login...');
client.login(DISCORD_TOKEN).catch(err => {
  console.error('❌ Login failed:', err);
});
