const axios = require('axios');
const config = require('./config');
const { CAT_PERSONA } = require('./persona');

async function generateResponse(userName, messageText) {
  try {
    // استخدام الموديل المستقر المحدث تلقائياً
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${config.GEMINI_API_KEY}`;

    const payload = {
      system_instruction: {
        parts: [{ text: CAT_PERSONA }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: `[المستخدم ${userName}]: ${messageText}` }]
        }
      ]
    };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply ? reply.trim() : 'عذراً، لم أستطع فهم ذلك... 🐾';

  } catch (error) {
    console.error('Gemini API Error:', error.response?.data || error.message);

    // محاولة احتياطية بموديل pro-latest
    try {
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${config.GEMINI_API_KEY}`;
      const fallbackPayload = {
        system_instruction: {
          parts: [{ text: CAT_PERSONA }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: `[المستخدم ${userName}]: ${messageText}` }]
          }
        ]
      };

      const fallbackRes = await axios.post(fallbackUrl, fallbackPayload, {
        headers: { 'Content-Type': 'application/json' }
      });

      const fallbackReply = fallbackRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return fallbackReply ? fallbackReply.trim() : 'عذراً، لم أستطع فهم ذلك... 🐾';

    } catch (fallbackErr) {
      console.error('Fallback Error:', fallbackErr.response?.data || fallbackErr.message);
      return 'عذراً يا صديقي، واجهت مشكلة بسيطة أثناء التفكير... 🐾';
    }
  }
}

module.exports = { generateResponse };
