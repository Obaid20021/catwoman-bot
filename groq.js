const axios = require('axios');
const { CAT_PERSONA } = require('./persona');
const config = require('./config');
const { getSentiment } = require('./db');

const conversationHistory = new Map();
const HISTORY_LIMIT = 12;

function getModel() {
  return (process.env.GROQ_MODEL || 'openai/gpt-oss-20b').trim();
}

function getHistory(userId) {
  if (!conversationHistory.has(userId)) conversationHistory.set(userId, []);
  return conversationHistory.get(userId);
}

function resolveIdentity(userId) {
  if (userId === config.OWNER_ID) {
    const sentiment = getSentiment(userId);
    if (sentiment > 0) return 'بروس واين، منافسها الرئيسي. علاقتهما دافئة الآن مع جذب خفي.';
    if (sentiment < 0) return 'بروس واين، منافسها الرئيسي. علاقتهما باردة الآن.';
    return 'بروس واين، منافسها الرئيسي. علاقتهما معقدة: منافسة + جذب خفي.';
  }
  const known = config.KNOWN_MEMBERS[userId];
  if (known) {
    const sentiment = getSentiment(userId);
    if (sentiment > 0) return `${known.name} — علاقتهما إيجابية الآن.`;
    if (sentiment < 0) return `${known.name} — علاقتهما سلبية الآن.`;
    return `${known.name} — علاقتهما محايدة.`;
  }
  return 'عضو عادي غير معروف لها من قبل.';
}

function cleanReply(raw) {
  let reply = raw.trim();
  reply = reply.replace(/^\[[^\]]*\]\s*:?\s*/gm, '').trim();
  reply = reply.replace(/^(كات|catwoman)\s*:\s*/i, '').trim();
  reply = reply.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, '');
  reply = reply.replace(/[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}\u{2300}-\u{23FF}\u{FE0F}]/gu, '');

  if (reply.length > 300) {
    const cut = reply.slice(0, 300);
    const lastDot = Math.max(
      cut.lastIndexOf('.'),
      cut.lastIndexOf('!'),
      cut.lastIndexOf('?'),
      cut.lastIndexOf('؟')
    );
    reply = lastDot > 150 ? cut.slice(0, lastDot + 1) : cut + '...';
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

    // خزّن الرسالة نظيفة بدون ترويسة
    history.push({ role: 'user', content: messageText });

    if (history.length > HISTORY_LIMIT) {
      history.splice(0, history.length - HISTORY_LIMIT);
    }

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: getModel(),
        messages: [
          { role: 'system', content: CAT_PERSONA },
          { role: 'system', content: `تخاطبين الآن: ${userName}. ${identity}` },
          ...history,
        ],
        temperature: 1.0,
        top_p: 0.95,
        frequency_penalty: 0.3,
        max_tokens: 300,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        timeout: 25000,
      }
    );

    const rawReply = response.data?.choices?.[0]?.message?.content;
    if (!rawReply) {
      console.error('Groq returned empty:', JSON.stringify(response.data).slice(0, 500));
      return 'ما فهمت، جرب مرة ثانية.';
    }

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
