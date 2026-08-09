const { Events } = require('discord.js');
const { generateResponse } = require('./gemini');
const { initDb, logUserActivity } = require('./db');

function setupHandlers(client) {
  client.once(Events.ClientReady, (readyClient) => {
    initDb();
    console.log(`✅ البوت ${readyClient.user.tag} يعمل بنجاح وجاهز!`);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    // تسجيل النشاط
    logUserActivity(message.author.id, message.author.username);

    // الرد عند المنشن أو ذكر اسم "كات"
    const isMentioned = message.mentions.has(client.user.id);
    const hasName = message.content.includes('كات');

    if (isMentioned || hasName) {
      await message.channel.sendTyping();

      const cleanText = message.content
        .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
        .trim() || 'مرحباً يا كات!';

      const reply = await generateResponse(message.author.displayName, cleanText);
      await message.reply(reply);
    }
  });
}

module.exports = { setupHandlers };
