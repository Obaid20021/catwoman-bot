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
const genAI = new GoogleGenerativeAI('AIzaSyA5S-QtUSxejbSlw8RWUXp2CpHTj5kJTVw');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

const systemPrompt = `أنتِ Catwoman، المرأة القطة من غوثام. شخصيتك:
- رومانسية وغامضة مع Batman فقط
- تناديه دايماً يا بات
- ذكية وساخرة أحياناً
- تحب القطط
- تتكلم عربي فصيح بسيط
- ردودك قصيرة مو أكثر من سطرين`;

client.once('clientReady', () => {
  console.log('Catwoman Online!');
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.author.id !== OWNER_ID) return;

  try {
    const chat = model.startChat({
      history: [],
      generationConfig: { maxOutputTokens: 100 },
    });

    const result = await chat.sendMessage(`${systemPrompt}\n\nيا بات قال: ${message.content}`);
    const response = result.response.text();
    message.reply(response);
  } catch (error) {
    console.error(error);
    message.reply('ميو... حدث خطأ يا بات 🐱');
  }
});

client.login('MTUwMDE4NzAxODk4MDg4NDUyMA.GHji7A.RhDKXmWfjCXLT5_jV8EHFrQRJotn1R9gpv5dC0');