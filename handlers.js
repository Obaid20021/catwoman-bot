const { generateResponse } = require('./groq');
const { updateSentiment } = require('./db');

async function handleMessage(message) {
  if (message.author.bot) return;

  // إذا تم الإشارة إلى البوت أو إرسال رسالة في الخاص (DM)
  const isMentioned = message.mentions.has(message.client.user);
  const isDM = !message.guild;

  if (!isMentioned && !isDM) return;

  try {
    await message.channel.sendTyping();

    // إزالة منشن البوت من نص الرسالة للحصول على المحتوى الصافي
    let userMessage = message.content
      .replace(new RegExp(`<@!?>${message.client.user.id}`, 'g'), '')
      .trim();

    if (!userMessage) {
      userMessage = 'مرحباً سيلينا...';
    }

    const reply = await generateResponse(message.author.id, userMessage);
    await message.reply(reply);
  } catch (error) {
    console.error('Error handling message:', error);
  }
}

module.exports = {
  handleMessage
};
