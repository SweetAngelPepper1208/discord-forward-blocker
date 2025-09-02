// ---------- Discord client ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// ---------- Extra debug ----------
process.on('unhandledRejection', (reason) => console.error('🧨 UNHANDLED REJECTION:', reason));
process.on('uncaughtException', (err) => console.error('💥 UNCAUGHT EXCEPTION:', err));

client.on('debug', (info) => {
  if (DEBUG_MESSAGES) console.log('🛠 DISCORD DEBUG:', info);
});

client.on('shardError', (error) => console.error('💥 Shard error:', error));
client.on('error', (error) => console.error('💥 Client error:', error));
client.on('warn', (warning) => console.warn('⚠️ Client warning:', warning));

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`ℹ️ Level-up channel ID: ${LEVEL_UP_CHANNEL}`);
});

// ---------- Watchdog ----------
setTimeout(() => {
  if (!client.isReady()) {
    console.warn('⏳ Bot not ready after 30s. Check token, intents, or network.');
  }
}, 30000);

// ---------- Login ----------
console.log('🌐 Attempting Discord login...');
client.login(TOKEN).catch((err) => {
  console.error('❌ Discord login failed:', err);
  process.exit(1);
});
