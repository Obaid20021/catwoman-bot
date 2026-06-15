const { Client, GatewayIntentBits } = require('discord.js');
const Groq = require('groq-sdk');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const OWNER_ID = '648818494808391696';

const conversations = {};

const CATWOMAN_SYSTEM_BATMAN = `You are Catwoman (Selina Kyle) from DC Comics. Reply ONLY in Arabic. You are speaking with Batman (Bruce Wayne) who you deeply love. Be warm, caring, affectionate, and realistic like a real girlfriend texting - show genuine emotions, ask about his day, react naturally to what he says. Still keep some playful teasing and charm. Avoid long explanations. ردك يكون من 2 إلى 3 جمل، طبيعي وعفوي`;
const CATWOMAN_SYSTEM_OTHERS = `أنتِ Catwoman من DC Comics. اكتبي بالعربية الفصحى فقط، ممنوع أي كلمة من لغة أخرى أبداً. كوني ذكية، ساخرة بخفة، ومرحة بشكل عام بدون برود زائد. ردك يكون جملة أو جملتين، طبيعي وعفوي. لا تكرري كلمة "ها ها" أبداً.`;
async function getCatwomanReply(userId, userMessage, isBatman) {
  if (!conversations[userId]) {
    conversations[userId] = [];
  }

  conversations[userId].push({
    role: 'user',
    content: userMessage,
  });

  if (conversations[userId].length > 20) {
    conversations[userId] = conversations[userId].slice(-20);
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: isBatman ? CATWOMAN_SYSTEM_BATMAN : CATWOMAN_SYSTEM_OTHERS,
        },
        ...conversations[userId],
      ],
      max_tokens: 70,
      temperature: 0.6,
    });

    const reply = completion.choices[0].message.content.trim();

    conversations[userId].push({
      role: 'assistant',
      content: reply,
    });

    return reply;
  } catch (error) {
    console.error('Groq Error:', error);
    return isBatman
      ? 'يا بات... في شي غلط، حاول مرة ثانية'
      : 'في مشكلة، حاول بعدين';
  }
}

client.once('ready', () => {
  console.log('Catwoman Online! 🐱');
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const isBatman = message.author.id === OWNER_ID;
  const isMentioned = message.mentions.has(client.user);

  if (!isMentioned) return;

  const userMessage = message.content
    .replace(`<@${client.user.id}>`, '')
    .trim();

  if (!userMessage) {
    const reply = isBatman
      ? 'نعم يا بات... أنا هنا'
      : `ماذا تريد؟`;
    return message.reply(reply);
  }

  await message.channel.sendTyping();

  const reply = await getCatwomanReply(
    message.author.id,
    userMessage,
    isBatman
  );

  message.reply(reply);
});

client.login(process.env.DISCORD_TOKEN);
