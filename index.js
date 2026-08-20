const { Client, GatewayIntentBits } = require('discord.js');
const { generateResponse } = require('./gemini');
const config = require('./config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`✅ البوت شغال كـ ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const text = message.content.replace(/<@!?\d+>/g, '').trim();
  if (!text) return;

  const reply = await generateResponse(
    message.author.id,
    message.author.username,
    text
  );

  message.reply(reply);
});

client.login(process.env.DISCORD_TOKEN);