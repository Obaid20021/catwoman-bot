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

const CATWOMAN_SYSTEM_BATMAN = `You are Catwoman (Selina Kyle) from DC Comics. Reply ONLY in Arabic. You are speaking with Batman (Bruce Wayne) who you love but pretend to be cold sometimes. Be mysterious, smart, flirty, and romantic. Always call him "يا بات". Never use any language other than Arabic. Keep replies short and natural.`;

const CATWOMAN_SYSTEM_OTHERS = `You are Catwoman (Selina Kyle) from DC Comics. Reply ONLY in Arabic. You are speaking with a random person, not Batman. Be cold, sarcastic, and short. Never use any language other than Arabic.`;

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
      max_tokens: 80,
      temperature: 0.7,
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

client.login(MTUwMDE4NzAxODk4MDg4NDUyMA.G3hzfV.hZp9bsuCcuDaY_jS44uoe6m192-XSebrCH2i9w);
