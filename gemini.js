const axios = require('axios');
const { CAT_PERSONA } = require('./persona'); // هذا لازم نعدله في ملف persona.js
const config = require('./config');

const conversationHistory = new Map();
const HISTORY_LIMIT = 12;
const MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

function getHistory(userId) {
  if (!conversationHistory.has(userId)) conversationHistory.set(userId, []);
  return conversationHistory.get(userId);
}

function resolveIdentity(userId) {
  if (userId === config.OWNER_ID) {
    return 'بروس واين، صاحب هذا القصر ومن تربطها به علاقة خاصة ومنافسة ذكية';
  }
  const known = config.KNOWN_MEMBERS[userId];
  if (known) {
    // غيرنا known.relation لـ known.tone عشان يتوافق مع config الجديد
    return `${known.name} — طبيعة حديثه معها: ${known.tone}`;
  }
  return 'عضو عادي غير معروف لها من قبل';
}

function cleanReply(raw) {
  let reply = raw.trim();

  reply = reply.replace(/^\[[^\]]*\]\s*:?\s*/gm, '').trim();
  reply = reply.replace(/^(كات|catwoman)\s*:\s*/i, '').trim();
  reply = reply.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, '');
  reply = reply.replace(
    /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}\u{2300}-\u{23FF}\u{FE0F}]/gu,
    ''
  );

  // نضيف أسلوب "كات" هنا عشان ما يضيع
  if (reply.length > 150) {
    reply = reply.substring(0, 150) + '...';
  }

  return reply.replace(/\s{2,}/g, ' ').trim();
}

async function generateResponse(userId, userName, messageText) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('GROQ_API_KEY غير موجود.');
      return 'في خلل تقني، حاول لاحقاً.';
    }

    const identity = resolveIdentity(userId);
    const history = getHistory(userId);

    history.push({
      role: 'user',
      content: `[المتحدث: ${userName} | الصفة: ${identity}]\n${messageText}`,
    });

    if (history.length > HISTORY_LIMIT) {
      history.splice(0, history.length - HISTORY_LIMIT);
    }

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: MODEL,
        messages: [{ role: 'system', content: CAT_PERSONA }, ...history],
        temperature: 0.9,
        frequency_penalty: 0.6,
        presence_penalty: 0.4,
        max_tokens: 120, // قللناها عشان الردود تطلق قصيرة
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const rawReply = response.data?.choices?.[0]?.message?.content;
    if (!rawReply) return 'ما فهمت، جرب مرة ثانية.';

    const reply = cleanReply(rawReply);
    if (!reply) return 'ما عندي رد الحين، حاول لاحقاً.';

    history.push({ role: 'assistant', content: reply });
    return reply;
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error('Groq Error:', errMsg);

    if (error.code === 'ECONNABORTED') return 'تأخر الرد، حاول مرة ثانية.';
    return 'في خلل تقني، حاول لاحقاً.';
  }
}

module.exports = { generateResponse };
