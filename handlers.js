const { Events } = require('discord.js');
const { generateResponse } = require('./groq');
const { initDb, logUserActivity } = require('./db');

const COOLDOWN = new Map();
const COOLDOWN_MS = 5000;
const BUSY = new Set(); // 🔒 يمنع معالجة رسالتين لنفس المستخدم بنفس الوقت

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

      const content = message.content || '';
      const isMentioned = message.mentions.has(client.user);
      // ✅ كلمة كاملة بدل "كات" الجزئية التي تلتقط كلمات أخرى
      const hasName = /(?:^|\s)(?:كات|catwoman)(?:\s|$|[,.!؟?])/i.test(content);

      if (!isMentioned && !hasName) return;

      const stripped = content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
      if (isMentioned && !stripped) return;

      const lastTime = COOLDOWN.get(message.author.id) || 0;
      if (Date.now() - lastTime < COOLDOWN_MS) return;

      // 🔒 إذا البوت لا يولّد رد لهذا المستخدم — تجاهل الرسالة الجديدة
      if (BUSY.has(message.author.id)) return;
      BUSY.add(message.author.id);
      COOLDOWN.set(message.author.id, Date.now());

      try {
        logUserActivity(message.author.id, message.author.username);
        await message.channel.sendTyping();

        const cleanText = stripped;
        const finalText = cleanText || 'مرحبا!';

        const reply = await generateResponse(
          message.author.id,
          message.author.username,
          finalText
        );

        // ✅ إرسال واحد فقط
        await message.reply({ content: reply, allowedMentions: { repliedUser: true } });
      } finally {
        BUSY.delete(message.author.id);
      }

    } catch (err) {
      console.error('خطأ:', err.message);
    }
  });
}

module.exports = { setupHandlers };
