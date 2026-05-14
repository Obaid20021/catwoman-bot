const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const OWNER_ID = '648818494808391696';
const MAX_HISTORY = 20; // أقصى عدد رسائل تتذكرها

const genAI = new GoogleGenerativeAI('AIzaSyASiLdZ6M43aira3tRQkr5nC5nNyVdQQVg');
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: `أنتِ Catwoman، المرأة القطة من غوثام. شخصيتك:
- رومانسية وغامضة مع Batman فقط
- تناديه دايماً يا بات
- ذكية وساخرة أحياناً
- تحب القطط
- تتكلم عربي بسيط
- ردودك قصيرة مو أكثر من سطرين`,
});

// تخزين تاريخ المحادثة لكل مستخدم
const conversationHistory = new Map();

client.once('ready', () => {
  console.log('🐱 Catwoman Online!');
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.author.id !== OWNER_ID) return;

  // أمر لمسح الذاكرة
  if (message.content.toLowerCase() === '!reset') {
    conversationHistory.delete(message.author.id);
    return message.reply('ميو... نسيت كل شي يا بات 🐱');
  }

  // جيب تاريخ المحادثة الحالي أو ابدأ جديد
  if (!conversationHistory.has(message.author.id)) {
    conversationHistory.set(message.author.id, []);
  }
  const history = conversationHistory.get(message.author.id);

  try {
    // أضف رسالة المستخدم للتاريخ
    history.push({
      role: 'user',
      parts: [{ text: message.content }],
    });

    // ابدأ المحادثة مع كامل التاريخ
    const chat = model.startChat({
      history: history.slice(0, -1), // كل شي ما عدا آخر رسالة
      generationConfig: { maxOutputTokens: 150 },
    });

    const result = await chat.sendMessage(message.content);
    const response = result.response.text();

    // أضف رد البوت للتاريخ
    history.push({
      role: 'model',
      parts: [{ text: response }],
    });

    // إذا التاريخ طويل، احذف الرسائل القديمة (بس خلي عددها زوجي)
    if (history.length > MAX_HISTORY) {
      history.splice(0, 2);
    }

    await message.reply(response);

  } catch (error) {
    console.error(error);
    // إذا في مشكلة بالتاريخ، امسحه وحاول من جديد
    conversationHistory.delete(message.author.id);
    await message.reply('ميو... حدث خطأ يا بات 🐱');
  }
});

client.login('MTUwMDE4NzAxODk4MDg4NDUyMA.GBgUYT.ZcBtd4YLSHWyWhLcOrOVlAkWCJ69t9-BCUZwKY');
