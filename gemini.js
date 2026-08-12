const axios = require('axios');
const { CAT_PERSONA } = require('./persona');

// ذاكرة محادثة قصيرة لكل مستخدم (تُصفَّر عند إعادة تشغيل البوت)
const conversationHistory = new Map();
const HISTORY_LIMIT = 10;

function getHistory(userId) {
  if (!conversationHistory.has(userId)) conversationHistory.set(userId, []);
  return conversationHistory.get(userId);
}

async function generateResponse(userId, userName, messageText) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error('❌ GROQ_API_KEY غير موجود في متغيرات البيئة (Railway).');
      return 'عذراً، لم يتم العثور على مفتاح الـ API الخاص بي.';
    }

    const history = getHistory(userId);
    history.push({ role: 'user', content: messageText });
    if (history.length > HISTORY_LIMIT) history.splice(0, history.length - HISTORY_LIMIT);

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: CAT_PERSONA },
          ...history,
        ],
        temperature: 0.85,
        frequency_penalty: 0.5,
        max_tokens: 150,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let reply = response.data?.choices?.[0]?.message?.content?.trim();

    if (!reply) return 'عذراً، لم أستطع فهم ذلك.';

    // إزالة أي بادئة بين قوسين مثل [كات]: أو [المستخدم]: قد يضيفها النموذج بالخطأ
    reply = reply.replace(/^\[.*?\]\s*:?\s*/g, '').trim();

    // إزالة أي رموز أجنبية (صينية/يابانية/كورية) أو كلمات إنجليزية مبعثرة
    reply = reply.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, '');
    reply = reply.replace(/\b[a-zA-Z]{2,}\b/g, '').replace(/\s{2,}/g, ' ').trim();

    if (!reply) reply = 'لم أفهم قصدك تماماً، حاول مرة أخرى.';

    history.push({ role: 'assistant', content: reply });
    return reply;
  } catch (error) {
    console.error('❌ Groq API Error:', error.response?.data || error.message);
    return 'عذراً، حدث خطأ أثناء محاولة التفكير. حاول مرة أخرى بعد قليل.';
  }
}

module.exports = { generateResponse };