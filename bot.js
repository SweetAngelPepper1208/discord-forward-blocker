// bot.js - Super-thorough login debug (uses env: DISCORD_TOKEN, WEBHOOK_URL, LEVEL_UP_CHANNEL, PORT, DEBUG_MESSAGES)
import { Client, GatewayIntentBits, Events, WebhookClient } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

(async () => {
  // ---------- resolve dirname ----------
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // ---------- load env (supports Render secret file or local .env) ----------
  const secretEnvPath = '/run/secrets/.env';
  if (fs.existsSync(secretEnvPath)) {
    dotenv.config({ path: secretEnvPath });
    console.log('✅ Loaded .env from Render secret file');
  } else {
    dotenv.config({ path: path.join(__dirname, '.env') });
    console.log('✅ Loaded local .env file (if present)');
  }

  // ---------- config + basic info ----------
  const DEBUG = (process.env.DEBUG_MESSAGES || 'true').toLowerCase() === 'true';
  const TOKEN = process.env.DISCORD_TOKEN || '';
  const WEBHOOK_URL = process.env.WEBHOOK_URL || '';
  const LEVEL_UP_CHANNEL = process.env.LEVEL_UP_CHANNEL || '';
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  console.log('--- ENV & runtime info ---');
  console.log('Node version:', process.version);
  console.log('Platform:', process.platform);
  console.log('PID:', process.pid);
  console.log('PORT (effective):', process.env.PORT ?? 'not set (using fallback)');
  console.log('DISCORD_TOKEN present:', !!TOKEN);
  console.log('WEBHOOK_URL present:', !!WEBHOOK_URL);
  console.log('LEVEL_UP_CHANNEL present:', !!LEVEL_UP_CHANNEL);
  console.log('DEBUG_MESSAGES:', DEBUG);
  if (TOKEN) console.log('Token length (chars):', TOKEN.length);

  // ---------- optional direct gateway test (uses ws if available) ----------
  try {
    const wsModule = await import('ws').then(m => m.default || m).catch(() => null);
    if (wsModule) {
      const gatewayUrl = 'wss://gateway.discord.gg/?v=10&encoding=json';
      console.log(`🌐 Attempting low-level WebSocket connection to Discord gateway: ${gatewayUrl}`);
      await new Promise((resolve) => {
        let opened = false;
        const t = setTimeout(() => {
          if (!opened) {
            console.warn('⏳ WebSocket test timeout (10s) — gateway may be blocked or slow.');
            try { ws.close(); } catch(e) {}
            resolve();
          }
        }, 10000);

        const ws = new wsModule(gatewayUrl);
        ws.onopen = () => {
          opened = true;
          console.log('✅ Low-level WebSocket connection to Discord gateway succeeded.');
          ws.close();
        };
        ws.onclose = (code, reason) => {
          clearTimeout(t);
          console.log(`ℹ️ WebSocket test closed (code=${code}, reason=${reason || 'none'})`);
          resolve();
        };
        ws.onerror = (err) => {
          clearTimeout(t);
          console.error('❌ Low-level WebSocket error (gateway test):', err && (err.message || err));
          resolve();
        };
      });
    } else {
      console.warn('⚠️ "ws" module not available — skipping low-level gateway test. (This is optional.)');
    }
  } catch (err) {
    console.warn('⚠️ Gateway test failed (unexpected):', err && err.message ? err.message : err);
  }

  // ---------- webhook client (optional) ----------
  let webhookClient = null;
  if (WEBHOOK_URL) {
    try {
      webhookClient = new WebhookClient({ url: WEBHOOK_URL });
      console.log('✅ WebhookClient created (WEBHOOK_URL provided).');
    } catch (err) {
      console.warn('⚠️ Failed to create WebhookClient:', err && (err.message || err));
    }
  } else {
    console.log('ℹ️ No WEBHOOK_URL provided — webhook functionality is disabled for now.');
  }

  // ---------- create Discord client ----------
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,      // required for role updates if you later use them
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  // ---------- process-level handlers ----------
  process.on('unhandledRejection', (reason) => {
    console.error('🧨 UNHANDLED REJECTION:', reason && (reason.stack || reason));
  });
  process.on('uncaughtException', (err) => {
    console.error('💥 UNCAUGHT EXCEPTION:', err && (err.stack || err));
  });

  // ---------- discord.js debug/warn/error handlers ----------
  client.on('debug', (info) => { if (DEBUG) console.log('🛠 DISCORD DEBUG:', info); });
  client.on('warn', (warn) => console.warn('⚠️ DISCORD WARN:', warn));
  client.on('error', (err) => console.error('❌ DISCORD ERROR:', err && (err.stack || err)));
  client.on('shardError', (err) => console.error('❌ SHARD ERROR:', err && (err.stack || err)));
  client.on('raw', (packet) => { if (DEBUG) console.log('🛰 RAW PACKET:', JSON.stringify(packet)); });

  // life-cycle events
  let readyFired = false;
  client.once(Events.ClientReady, () => {
    readyFired = true;
    try {
      console.log('✅ ClientReady fired! Bot is READY.');
      console.log('Bot user:', client.user?.tag ?? '(no tag)');
      console.log('Bot id:', client.user?.id ?? '(no id)');
      // show a few runtime stats
      console.log('Guilds cached:', client.guilds.cache.size);
      console.log('Uptime (ms):', client.uptime ?? '(n/a)');
      try { console.log('WS ping (ms):', client.ws?.ping ?? '(n/a)'); } catch {}
    } catch (e) {
      console.error('Error in ready handler:', e && (e.stack || e));
    }
  });

  client.on('invalidated', () => {
    console.warn('⚠️ Session invalidated event received — the token may be invalid or revoked.');
  });

  client.on('disconnect', (event) => {
    console.warn('⚠️ DISCONNECT event:', event);
  });

  client.on('reconnecting', () => {
    console.log('🔄 Reconnecting to gateway...');
  });

  client.on('resume', (replayed) => {
    console.log('🔁 Resumed session. Events replayed:', replayed);
  });

  // ---------- attempt login and capture exact error ----------
  console.log('🌐 Attempting Discord login using DISCORD_TOKEN from env...');
  try {
    await client.login(TOKEN)
      .then(() => console.log('✅ client.login() resolved (authentication step passed).'))
      .catch((e) => {
        // client.login may reject synchronously as well
        throw e;
      });
  } catch (err) {
    // Very important: show exact error so you know why auth failed
    console.error('❌ Discord login failed (client.login rejected). Full error below:');
    console.error(err && (err.stack || err));
    // Provide human guidance in logs
    console.error('\n--- Quick troubleshooting hints ---');
    console.error('- If the error is "TokenInvalid" => reset token in Discord Developer Portal and update DISCORD_TOKEN on Render (no quotes, no spaces).');
    console.error('- If the error mentions "Privileged Intent" => enable Message Content / Server Members intents in Developer Portal (Bot page).');
    console.error('- If the error mentions network/timeouts => Render might be blocking outbound gateway traffic (rare).');
    process.exit(1);
  }

  // ---------- watchdog: if not ready after 30s give detailed info ----------
  setTimeout(() => {
    if (!readyFired) {
      console.warn('⏳ Bot not ready after 30s. Detailed diagnostics follow:');
      try {
        console.warn('- Token present:', !!TOKEN, `(length ${TOKEN.length})`);
        console.warn('- WEBHOOK_URL present:', !!WEBHOOK_URL);
        console.warn('- LEVEL_UP_CHANNEL present:', !!LEVEL_UP_CHANNEL);
        console.warn('- DEBUG_MESSAGES:', DEBUG);
        console.warn('- Guilds cached:', client.guilds.cache.size);
        try { console.warn('- WS ping (ms):', client.ws?.ping ?? '(n/a)'); } catch {}
      } catch (e) {
        console.warn('Error while printing diagnostics:', e && (e.stack || e));
      }
      console.warn('\nRecommended next steps:');
      console.warn('1) If you recently regenerated the bot token, make sure Render DISCORD_TOKEN is the NEW token (no quotes/spaces).');
      console.warn('2) Enable Message Content Intent and Server Members Intent in the Bot settings of the Discord Developer Portal.');
      console.warn('3) Check Render logs for any "TokenInvalid" or "401 Unauthorized" messages above.');
      console.warn('4) If none of the above, consider regenerating token and updating Render secret, then redeploy.');
    }
  }, 30000);

  // ---------- minimal Express keep-alive for Render ----------
  const app = express();
  app.get('/', (req, res) => res.send('Debug bot alive.'));
  app.listen(PORT, () => console.log(`🌐 Express server listening on port ${PORT} (process.env.PORT = ${process.env.PORT ?? 'not set'})`));

  // ---------- helpful endpoint to quickly test webhook if provided ----------
  if (webhookClient) {
    app.get('/debug-webhook', async (req, res) => {
      try {
        await webhookClient.send({ content: `Webhook test at ${new Date().toISOString()}`, username: 'DebugWebhook' });
        res.send('Webhook test sent (check channel).');
      } catch (err) {
        console.error('❌ Webhook test failed:', err && (err.stack || err));
        res.status(500).send('Webhook test failed. See logs.');
      }
    });
    console.log('ℹ️ /debug-webhook endpoint created to test WEBHOOK_URL (GET request).');
  } else {
    console.log('ℹ️ No webhook configured; /debug-webhook disabled.');
  }

  // ---------- finished initialization ----------
  console.log('--- debug bot initialization complete — watching login/ready events ---');
})();
