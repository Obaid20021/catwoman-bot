const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const { setupHandlers } = require('./handlers');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

setupHandlers(client);

if (!config.DISCORD_TOKEN) {
  console.error('❌ خطأ: لم يتم العثور على DISCORD_TOKEN في متغيرات البيئة!');
} else {
  client.login(config.DISCORD_TOKEN);
}
