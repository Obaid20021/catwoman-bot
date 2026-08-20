process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED:', err);
  process.exit(1);
});

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { setupHandlers } = require('./handlers');
const config = require('./config');

console.log('🔄 البوت يحاول التشغيل...');
console.log('TOKEN exists:', !!config.DISCORD_TOKEN);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel],
});

setupHandlers(client);

client.login(config.DISCORD_TOKEN)
  .then(() => console.log('🔐 تم تسجيل الدخول بنجاح'))
  .catch((err) => {
    console.error('❌ فشل تسجيل الدخول:', err.message);
    process.exit(1);
  });