const axios = require('axios');
const config = require('./config');
const { CAT_PERSONA } = require('./persona');

let activeModel = null;

// دالة لاكتشاف الموديل الشغال في حسابك تلقائياً
async function getWorkingModel() {
  if (activeModel) return activeModel;

  try {
    const res = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${config.GEMINI_API_KEY}`
    );
    const models = res.data?.models || [];
    
    // البحث عن أول موديل يدعم generateContent
    const validModel = models.find(m => 
      m.supportedGenerationMethods?.includes('generateContent') &&
      m.name.includes('flash')
    ) || models.find(m => m.supportedGenerationMethods?.includes('generateContent'));

    if (validModel) {
      // إزالة سابقة models/ إن وجدت
      activeModel = validModel.name.replace('models/', '');
      console.log(`[Gemini] Model selected: ${activeModel}`);
      return activeModel;
    }
  } catch (err) {
    console.error('Failed to list models:', err.response?.data || err.message);
  }

  // افتراضي في حال فشل القائمة
  return 'gemini-1.5-flash';
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
    // إرست الموديل المحفوظ في حال حدث خطأ لإعادة اكتشافه في الطلب القادم
    activeModel = null;
    return 'عذراً يا صديقي، واجهت مشكلة بسيطة أثناء التفكير... 🐾';
  }
}

module.exports = { generateResponse };
