const axios = require('axios');
const { CAT_PERSONA } = require('./persona');
const config = require('./config');
const { getSentiment } = require('./db');

const conversationHistory = new Map();
const HISTORY_LIMIT = 12;

function getModel() {
  return (process.env.GROQ_MODEL || config.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();
}

function getHistory(userId) {
  if (!conversationHistory.has(userId)) conversationHistory.set(userId, []);
  return conversationHistory.get(userId);
}

async function resolveIdentity(userId) {
  if (userId === config.OWNER_ID) {
    const sentiment = await getSentiment(userId);
    if (sentiment > 0) return 'بروس واين، منافسها الرئيسي. علاقتهما دافئة الآن مع جذب خفي.';
    if (sentiment < 0) return 'بروس واين، منافسها الرئيسي. علاقتهما باردة الآن.';
    return 'بروس واين، منافسها الرئيسي. علاقتهما معقدة: منافسة + جذب خفي.';
  }
  const known = config.KNOWN_MEMBERS ? config.KNOWN_MEMBERS[userId] : null;
  if (known) {
    const sentiment = await getSentiment(userId);
    if (sentiment > 0) return `علاقتهما إيجابية الآن - ${known.name}`;
    if (sentiment < 0) return `علاقتهما سلبية الآن - ${known.name}`;
    return `علاقتهما محايدة - ${known.name}`;
  }
  return 'عضو عادي غير معروف لها من قبل.';
}

function cleanReply(raw) {
  let reply = raw.trim();
  reply = reply.replace(/^\[[^\]]+\]\s*:\s*/gm, '').trim();
  reply = reply.replace(/^(\*|catwoman)\s*:\s*/i, '').trim();
  reply = reply.replace(/[一-鿿぀-ヿ가-힯]/g, '');
  reply = reply.replace(/[\u{1F300}-\u{1Faff}\u{2700}-\u{27BF}\u{2600}-\u{26FF}\u{2300}-\u{23FF}\u{FE0F}]/gu, '');

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
  return reply;
}

async function generateResponse(userId, userMessage) {
  const history = getHistory(userId);
  const identityContext = await resolveIdentity(userId);

  const messages = [
    {
      role: 'system',
      content: `${CAT_PERSONA}\n\nمعلومات عن المستخدم الحاضر:\n${identityContext}`
    },
    ...history,
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: getModel(),
        messages: messages,
        temperature: 0.75,
        max_tokens: 400
      },
      {
        headers: {
          'Authorization': `Bearer ${config.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const rawReply = response.data.choices[0].message.content;
    const cleaned = cleanReply(rawReply);

    history.push({ role: 'user', content: userMessage });
    history.push({ role: 'assistant', content: cleaned });

    if (history.length > HISTORY_LIMIT) {
      history.splice(0, history.length - HISTORY_LIMIT);
    }

    return cleaned;
  } catch (error) {
    console.error('Groq API Error:', error?.response?.data || error.message);
    return 'يبدو أن ظلال غوثام تعطل الاتصال حالياً... سنلتقي لاحقاً.';
  }
}

module.exports = {
  generateResponse,
  getHistory,
  cleanReply,
  resolveIdentity,
  getModel
};
