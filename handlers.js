const { Events } = require('discord.js');
const { generateResponse } = require('./gemini');
const { initDb, logUserActivity, updateSentiment } = require('./db');

const COOLDOWN = new Map();
const COOLDOWN_MS = 5000;

function setupHandlers(client) {
  client.once(Events.ClientReady, (readyClient) => {
    initDb();
    console.log(`كات جاهزة — ${readyClient.user.tag}`);
    readyClient.user.setPresence({
      status: 'online',
      activities: [{ name: 'أراقب جوثام', type: 3 }],
    });
  });

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;

      const isMentioned = message.mentions.has(client.user);
      const hasName = message.content.includes('كات');
      
      if (!isMentioned && !hasName) return;
      if (isMentioned && !message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim()) {
        return;
      }

      const lastTime = COOLDOWN.get(message.author.id) || 0;
      if (Date.now() - lastTime < COOLDOWN_MS) return;
      COOLDOWN.set(message.author.id, Date.now());

      logUserActivity(message.author.id, message.author.username);
      await message.channel.sendTyping();

      const cleanText = message.content
        .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
        .trim();

      const finalText = cleanText || 'مرحباً!';

      const reply = await generateResponse(
        message.author.id,
        message.author.username,
        finalText
      );

      await message.reply(reply);

    } catch (err) {
      console.error('خطأ:', err.message);
    }
  });
}

module.exports = { setupHandlers };
