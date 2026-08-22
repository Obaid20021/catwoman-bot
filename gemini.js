const axios = require('axios');
const { CAT_PERSONA } = require('./persona');
const config = require('./config');

const conversationHistory = new Map();
const HISTORY_LIMIT = 12;

function getHistory(userId) {
  if (!conversationHistory.has(userId)) conversationHistory.set(userId, []);
  return conversationHistory.get(userId);
}

function resolveIdentity(userId) {
  if (userId === config.OWNER_ID) {
    return 'بروس واين، صاحب هذا القصر ومن تربطها به علاقة خاصة ومنافسة ذكية';
  }
  const known = config.KNOWN_MEMBERS[userId];
  if (known) return `${known.name} — طبيعة علاقتهما: ${known.relation}`;
  return 'عضو عادي غير معروف لها من قبل';
}

async function generateResponse(userId, userName, messageText) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return 'في خلل تقني، حاول لاحقاً.';

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
        model: process.env.GROQ_MODEL,
        messages: [
          { role: 'system', content: CAT_PERSONA },
          ...history,
        ],
        temperature: 0.9,
        frequency_penalty: 0.6,
        presence_penalty: 0.4,
        max_tokens: 85,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    let reply = response.data?.choices?.[0]?.message?.content?.trim();
    if (!reply) return 'ما فهمت، جرب مرة ثانية.';

    reply = reply.replace(/^\[.*?\]\s*:?\s*/gm, '').trim();
    reply = reply.replace(/^(كات|catwoman)\s*:\s*/gim, '').trim();
    reply = reply.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, '');
    reply = reply.replace(/\b[a-zA-Z]{3,}\b/g, '').replace(/\s{2,}/g, ' ').trim();

    if (!reply) return 'ما عندي رد الحين، حاول لاحقاً.';

    history.push({ role: 'assistant', content: reply });
    return reply;

  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error('❌ Groq Error:', errMsg);
    if (error.code === 'ECONNABORTED') return 'تأخر الرد، حاول مرة ثانية.';
    return 'في خلل تقني، حاول لاحقاً.';
  }
}

module.exports = { generateResponse };
