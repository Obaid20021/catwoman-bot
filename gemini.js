const { GoogleGenAI } = require('@google/genai');
const config = require('./config');
const { CAT_PERSONA } = require('./persona');

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

async function generateResponse(userName, messageText) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `[المستخدم ${userName}]: ${messageText}`,
      config: {
        systemInstruction: CAT_PERSONA,
      },
    });

    return response.text ? response.text.trim() : 'عذراً، لم أستطع فهم ذلك... 🐾';
  } catch (error) {
    console.error('Gemini Error:', error);
    return 'عذراً يا صديقي، واجهت مشكلة بسيطة أثناء التفكير... 🐾';
  }
}

module.exports = { generateResponse };
