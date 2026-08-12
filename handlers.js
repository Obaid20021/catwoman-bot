const { Events } = require('discord.js');
const { generateResponse } = require('./gemini');
const { initDb, logUserActivity } = require('./db');

function setupHandlers(client) {
  client.once(Events.ClientReady, (readyClient) => {
    initDb();
    console.log(`✅ البوت جاهز، وسجل الدخول باسم ${readyClient.user.tag}`);
  });

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;

      // تسجيل النشاط
      logUserActivity(message.author.id, message.author.username);

      // الرد عند المنشن أو ذكر اسم "كات"
      const isMentioned = message.mentions.has(client.user);
      const hasName = message.content.includes('كات');

      if (!isMentioned && !hasName) return;

      await message.channel.sendTyping();

      const cleanText = message.content
        .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
        .trim();

      const finalText = cleanText || 'مرحباً يا كات!';

      const reply = await generateResponse(message.author.username, finalText);
      await message.reply(reply);
    } catch (err) {
      console.error('❌ خطأ في معالجة الرسالة:', err.message);
    }
  });
}

module.exports = { setupHandlers };