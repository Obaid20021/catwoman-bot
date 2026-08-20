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
  .then(() => console.log('🔐 تم تسجيل الدخول بنجاح'))
  .catch((err) => {
    console.error('❌ فشل تسجيل الدخول:', err.message);
    process.exit(1);
  });