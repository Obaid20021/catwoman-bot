const axios = require('axios');
const config = require('./config');
const { CAT_PERSONA } = require('./persona');

let activeModel = null;

async function getWorkingModel() {
  if (activeModel) return activeModel;

  try {
    const res = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${config.GEMINI_API_KEY}`
    );
    const models = res.data?.models || [];
    
    // استبعاد الموديلات التي تعطي 404 واختيار الموديلات المعتمدة فقط
    const validModel = models.find(m => 
      m.supportedGenerationMethods?.includes('generateContent') &&
      !m.name.includes('2.5') &&
      (m.name.includes('1.5-flash') || m.name.includes('1.5-pro'))
    );

    if (validModel) {
      activeModel = validModel.name.replace('models/', '');
      console.log(`[Gemini] Model selected successfully: ${activeModel}`);
      return activeModel;
    }
  } catch (err) {
    console.error('Failed to list models:', err.response?.data || err.message);
  }

  // الموديل الافتراضي المضمون
  activeModel = 'gemini-1.5-flash';
  return activeModel;
}

async function generateResponse(userName, messageText) {
  try {
    const modelName = await getWorkingModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.GEMINI_API_KEY}`;

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
    console.error('Gemini Execution Error:', error.response?.data || error.message);
    // تصفير الموديل في حال حدث أي خطأ لإعادة البحث
    activeModel = null;
    return 'عذراً يا صديقي، واجهت مشكلة بسيطة أثناء التفكير... 🐾';
  }
}

module.exports = { generateResponse };
