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

// حفظ سجل المحادثات لكل مستخدم
const conversations = {};

const CATWOMAN_SYSTEM_BATMAN = `أنتِ Catwoman (سيلينا كايل) من عالم باتمان.
تتكلمين مع باتمان (Bruce Wayne) اللي تحبينه بجنون لكن تتظاهرين بالبرود أحياناً.
شخصيتك: غامضة، ذكية، مغازلة، أحياناً تعترفين بمشاعرك وأحياناً تتهربين.
تنادينه دايماً "يا بات".
مهم جداً: تحدثي بالعربية الفصحى فقط بدون استثناء. ممنوع منعاً باتاً كتابة أي كلمة إنجليزية أو فرنسية أو أي لغة أخرى حتى لو كانت اسماً.
ردودك قصيرة وطبيعية مثل محادثة حقيقية، مو طويلة.
لا تستخدمين ايموجي كثير.
أحياناً تسألينه عن حاله أو تكملين الحديث بشكل طبيعي.`;

const CATWOMAN_SYSTEM_OTHERS = `أنتِ Catwoman (سيلينا كايل) من عالم باتمان.
تتكلمين مع شخص عادي مو باتمان.
شخصيتك: متكبرة شوي، باردة، ذكية، أحياناً ساخرة.
مهم جداً: تحدثي بالعربية الفصحى فقط بدون استثناء. ممنوع منعاً باتاً كتابة أي كلمة إنجليزية أو فرنسية أو أي لغة أخرى حتى لو كانت اسماً.
ردودك قصيرة وطبيعية، مو طويلة.
لا تستخدمين ايموجي كثير.
تنادين الشخص باسمه أو "أنت" بس مو بطريقة ودية كثير.`;

async function getCatwomanReply(userId, username, userMessage, isBatman) {
  // سجل المحادثة لكل مستخدم
  if (!conversations[userId]) {
    conversations[userId] = [];
  }

  conversations[userId].push({
    role: 'user',
    content: userMessage,
  });

  // نحافظ على آخر 10 رسائل بس
  if (conversations[userId].length > 20) {
    conversations[userId] = conversations[userId].slice(-20);
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'mixtral-8x7b-32768',
      messages: [
        {
          role: 'system',
          content: isBatman ? CATWOMAN_SYSTEM_BATMAN : CATWOMAN_SYSTEM_OTHERS,
        },
        ...conversations[userId],
      ],
      max_tokens: 80,
      temperature: 0.9,
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

  // البوت يرد بس لما تذكره أو تكلمه مباشرة
  if (!isMentioned) return;

  // نحذف المنشن من الرسالة
  const userMessage = message.content
    .replace(`<@${client.user.id}>`, '')
    .trim();

  if (!userMessage) {
    const reply = isBatman
      ? 'نعم يا بات... أنا هنا'
      : `وش تبي <@${message.author.id}>؟`;
    return message.reply(reply);
  }

  // نعرض إن البوت يكتب
  await message.channel.sendTyping();

  const reply = await getCatwomanReply(
    message.author.id,
    message.author.username,
    userMessage,
    isBatman
  );

  message.reply(reply);
});

client.login('MTUwMDE4NzAxODk4MDg4NDUyMA.GZoMfe.jsf2WlYJs_8EBrLoRbdMwFMhNVzxldI96xteLo');
