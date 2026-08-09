const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('./config');
const { CAT_PERSONA } = require('./persona');

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

// استخدام موديل gemini-1.5-flash المباشر والرسمي
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: CAT_PERSONA,
});

async function generateResponse(userName, messageText) {
  try {
    const prompt = `[المستخدم ${userName}]: ${messageText}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text ? text.trim() : 'عذراً، لم أستطع فهم ذلك... 🐾';
  } catch (error) {
    console.error('Gemini Error:', error);
    return 'عذراً يا صديقي، واجهت مشكلة بسيطة أثناء التفكير... 🐾';
  }
}

module.exports = { generateResponse };
