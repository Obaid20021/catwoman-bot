const axios = require('axios');
const config = require('./config');
const { CAT_PERSONA } = require('./persona');

let cachedModel = null;

// البحث التلقائي عن الموديل المتاح في حسابك
async function getValidModel() {
  if (cachedModel) return cachedModel;

  try {
    const res = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${config.GEMINI_API_KEY}`
    );
    
    const models = res.data?.models || [];
    // اختيار أول موديل يدعم generateContent
    const workingModel = models.find(m => 
      m.supportedGenerationMethods?.includes('generateContent') &&
      (m.name.includes('flash') || m.name.includes('pro'))
    );

    if (workingModel) {
      cachedModel = workingModel.name; // الاسم يرجع كاملاً مثل: models/gemini-1.5-flash
      console.log(`[Gemini] Model selected: ${cachedModel}`);
      return cachedModel;
    }
  } catch (err) {
    console.error('Failed to auto-detect model:', err.response?.data || err.message);
  }

  // كخيار احتياطي
  return 'models/gemini-1.5-flash';
}

async function generateResponse(userName, messageText) {
  try {
    const modelPath = await getValidModel();
    // بناء الرابط بشكل صحيح بدون تكرار models/
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${config.GEMINI_API_KEY}`;

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
    // تصفير الموديل في حال حدث أي خطأ لإعادة المحاولة
    cachedModel = null;
    return 'عذراً يا صديقي، واجهت مشكلة بسيطة أثناء التفكير... 🐾';
  }
}

module.exports = { generateResponse };