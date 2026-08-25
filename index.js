process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED:', err);
  process.exit(1);
});

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { setupHandlers } = require('./handlers');
const config = require('./config');

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
  .then(() => console.log('تم تسجيل الدخول'))
  .catch((err) => {
    console.error('فشل تسجيل الدخول:', err.message);
    process.exit(1);
  });

// منع Railway من إيقاف البوت
process.on('SIGTERM', () => {
  console.log('SIGTERM received, keeping alive...');
});

const http = require('http');
http.createServer((req, res) => res.end('ok')).listen(process.env.PORT || 3000);
