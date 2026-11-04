const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const { handleMessage } = require('./handlers');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

client.once('ready', () => {
  console.log(`Catwoman is prowling the shadows as ${client.user.tag}`);
});

client.on('messageCreate', handleMessage);

if (!config.DISCORD_TOKEN || config.DISCORD_TOKEN === 'YOUR_DISCORD_BOT_TOKEN') {
  console.error('Please set a valid DISCORD_TOKEN in your .env file or config.js');
} else {
  client.login(config.DISCORD_TOKEN);
}
