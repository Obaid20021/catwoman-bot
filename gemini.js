const axios = require('axios');
const config = require('./config');
const { CAT_PERSONA } = require('./persona');

async function generateResponse(userName, messageText) {
  try {
    // استخدام نقطة النهاية المستقرة v1 بدلاً من v1beta
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${config.GEMINI_API_KEY}`;

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

    // محاولة احتياطية على v1 باستخدام موديل 2.0-flash
    try {
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`;
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
