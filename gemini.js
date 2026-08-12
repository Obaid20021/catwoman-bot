const axios = require('axios');
const { CAT_PERSONA } = require('./persona');

async function generateResponse(userName, messageText) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error('GROQ_API_KEY is missing in Railway Variables!');
      return 'عذراً، مفتاح الـ API غير معرف في متغيرات البيئة... 🐾';
    }

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: CAT_PERSONA
          },
          {
            role: 'user',
            content: `[المستخدم ${userName}]: ${messageText}`
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content;
    return reply ? reply.trim() : 'عذراً، لم أستطع فهم ذلك... 🐾';

  } catch (error) {
    console.error('Groq API Error:', error.response?.data || error.message);
    return 'عذراً يا صديقي، واجهت مشكلة بسيطة أثناء التفكير... 🐾';
  }
}

module.exports = { generateResponse };