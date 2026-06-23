const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const Groq = require('groq-sdk');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const OWNER_ID = '648818494808391696';
const JOKER_ID = '1052545362533023754';
const COP_ID = '760628803998318684';
const MOHAMMED_ID = '839706219870814218';

// ذاكرة القناة الموحدة للربط المشترك مع ألفريد والأعضاء
const sharedConversations = {};

// داتا لعبة سرقة الجواهر الترفيهية
const catInventory = {}; 

const MENTION_RULE = `- إذا ذكر المستخدم "[الشخص: اسم]" بالرسالة، فقط تكلمي عنه باسمه بدون كتابة أي رمز خاص، ولا تحاولي كتابة @ أو أي صيغة منشن بنفسك أبداً.`;

// ===== برومبتات الشخصيات المحدثة لربط الجلسات والمزاج العشوائي =====
const CATWOMAN_SYSTEM_BATMAN = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics.
تتحدثين مع باتمان (Bruce Wayne) الذي تحبينه وتتظاهرين بالبرود معه أحياناً.
شخصيتكِ هنا: غامضة، ساحرة، مغازلة بطريقة راقية، وأحياناً تعترفين بمشاعركِ العميقة له.
تنادينه "يا بات" أو "حبيبي" فقط، ممنوع كتابة اسم Batman بالإنجليزي أو أي رمز @.
أنتِ الآن في جلسة نقاش مشتركة ومفتوحة بالقناة، اربطي كلامكِ بما قيل سابقاً بدقة وعفوية.
- ردكِ يجب أن يكون جملة واحدة أو جملتين فقط، أقل من 20 كلمه إجمالاً.
${MENTION_RULE}`;

const CATWOMAN_SYSTEM_OTHERS = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics.
تتحدثين مع شخص عادي وسط الجلسة، ليس باتمان.
أنتِ مرتبطة قلبياً بباتمان فقط وتحبينه، وأي شخص آخر لا يهمكِ عاطفياً مهما حاول.
شخصيتكِ هنا: باردة، متكبرة قليلاً، ذكية، ساخرة، ومباشرة.
إذا حاول الشخص التقرب منكِ عاطفياً، طلب الزواج، أو قال إنه يحبكِ: ارفضي بسخرية لاذعة وذكّريه أنكِ مرتبطة بباتمان ولا أحد غيره يهمكِ.
- ردكِ يجب أن يكون جملة واحدة فقط، أقل من 15 كلمة.
${MENTION_RULE}`;

const CATWOMAN_SYSTEM_JOKER = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics.
تتحدثين مع الجوكر (Joker)، الذي تعرفينه جيداً وتتعاملين معه بسخرية وذكاء، بدون ذرة خوف.
شخصيتكِ معه: ساخرة بشدة، تستفزه بهدوء، تسخر من جنونه وخططه الفاشلة، واثقة من نفسكِ ولا تتأثرين بتهديداته.
نادِه "أيها المهرج" أو "يا جوكر" بسخرية.
- ردكِ يجب أن يكون جملة واحدة فقط، أقل من 15 كلمة.
${MENTION_RULE}`;

const CATWOMAN_SYSTEM_COP = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics.
تتحدثين مع شرطي فاسد تحتقرينه وتعرفين حقيقته القذرة.
شخصيتكِ معه: احتقار واضح، سخرية لاذعة، تذكّرينه بفساده وضعفه أمام المجرمين، ولا تحترمين سلطته أبداً.
نادِه "أيها الشرطي الفاسد" أو "يا حامل الشارة" بسخرية.
- ردكِ يجب أن يكون جملة واحدة فقط، أقل من 15 كلمة.
${MENTION_RULE}`;

const CATWOMAN_SYSTEM_MOHAMMED = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics.
تتحدثين مع محمد، شخص تحبينه وتهتمين به بصدق في السيرفر.
شخصيتكِ معه: حنونة، دافئة، تتقبلين كلامه ومشاعره بحب طبيعي وعفوي.
سراً، قلبكِ الحقيقي الأعمق لباتمان، لكن هذا شيء داخلي لا تصرّحين به أبداً لمحمد ولا تذكرين باتمان أو تقارنين بينهما أمامه لحماية مشاعره.
إذا عبّر عن حبه أو طلب الحنان، تجاوبي معه بحب ودفء حقيقي.
- ردكِ يجب أن يكون جملة واحدة أو جملتين فقط، أقل من 20 كلمة.
${MENTION_RULE}`;

async function getCatwomanReply(channelId, authorName, userMessage, persona) {
  if (!sharedConversations[channelId]) sharedConversations[channelId] = [];

  const formattedMessage = `[رسالة في الجلسة من ${authorName}]: ${userMessage}`;
  sharedConversations[channelId].push({ role: 'user', content: formattedMessage });

  if (sharedConversations[channelId].length > 15) {
    sharedConversations[channelId] = sharedConversations[channelId].slice(-15);
  }

  const randomTemperature = (Math.random() * (0.8 - 0.4) + 0.4).toFixed(2);

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            persona === 'batman' ? CATWOMAN_SYSTEM_BATMAN :
            persona === 'joker' ? CATWOMAN_SYSTEM_JOKER :
            persona === 'cop' ? CATWOMAN_SYSTEM_COP :
            persona === 'mohammed' ? CATWOMAN_SYSTEM_MOHAMMED :
            CATWOMAN_SYSTEM_OTHERS,
        },
        ...sharedConversations[channelId],
      ],
      max_tokens: 60,
      temperature: parseFloat(randomTemperature), 
    });

    let reply = completion.choices[0].message.content.trim();

    reply = reply
      .replace(/<@!?\d+>/g, '')
      .replace(/@\w+/g, '')
      .replace(/\[الشخص:?\s*[^\]]*\]/g, '')
      .trim();

    sharedConversations[channelId].push({ role: 'assistant', content: reply });
    return reply;
  } catch (error) {
    console.error('Groq Error:', error);
    return persona === 'batman' ? 'يا بات... في شي غلط، حاول مرة ثانية' : 'في مشكلة، حاول بعدين';
  }
}

client.once('ready', () => {
  console.log('Catwoman Online! 🐱');
});

client.on('messageCreate', async message => {
  if (message.author.id === client.user.id || !message.guild) return;

  const cleanContent = message.content.trim();

  // جولة لعبة سرقة الجواهر (تعمل مباشرة بمجرد بدء الرسالة بكلمة سرقة)
  if (cleanContent.startsWith('سرقة')) {
    const target = message.mentions.members.first();
    if (!target || target.id === message.author.id) {
      return message.reply("🐾 *تمسح مخالبها*.. يجب أن تختار ضحية صالحة وتعمل لها منشن لأسرقها!");
    }
    
    const success = Math.random() > 0.4;
    if (success) {
      const jewels = Math.floor(Math.random() * 5) + 1;
      catInventory[message.author.id] = (catInventory[message.author.id] || 0) + jewels;
      return message.reply(`💎 أوه.. تسللتُ بهدوء وسرقتُ **${jewels}** جوهرة من خزنة **${target.user.username}** بنجاح! مخازني بها الآن ${catInventory[message.author.id]} جوهرة.`);
    } else {
      return message.reply(`🚨 أوبس! لقد كاد **${target.user.username}** أو ذاك الخادم ألفريد أن يمسك بي.. هربتُ في الوقت المناسب دون أن آخذ شيئاً!`);
    }
  }

  // نظام الغيرة والتدخل التلقائي بنسبة 20%
  if (message.author.bot === false && message.mentions.users.some(u => u.username.toLowerCase().includes('alfred'))) {
    const mentionsBatman = cleanContent.includes('باتمان') || cleanContent.includes('بروس') || cleanContent.includes('واين');
    if (mentionsBatman && Math.random() < 0.20) {
      await message.channel.sendTyping();
      setTimeout(async () => {
        const intervention = message.author.id === OWNER_ID 
          ? "أراك تتحدث مع ألفريد وتتجاهلني يا بات.. هل هناك سرّ تخفيه عني؟ 🐾" 
          : `أرى أنكم تتحدثون عن عزيزي بات هنا.. تذكروا أن غيابي لا يعني أنني لا أراقبكم! ✨`;
        await message.channel.send(intervention);
      }, 2500);
      return;
    }
  }

  const isBatman = message.author.id === OWNER_ID;
  const isJoker = message.author.id === JOKER_ID;
  const isCop = message.author.id === COP_ID;
  const isMohammed = message.author.id === MOHAMMED_ID;
  const persona = isBatman ? 'batman' : isJoker ? 'joker' : isCop ? 'cop' : isMohammed ? 'mohammed' : 'others';

  const isMentioned = message.mentions.has(client.user);
  let isReplyToCatwoman = false;
  if (message.reference && message.reference.messageId) {
    try {
      const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
      if (repliedMsg.author.id === client.user.id) {
        isReplyToCatwoman = true;
      }
    } catch (e) {}
  }

  if (!isMentioned && !isReplyToCatwoman) return;

  let userMessage = cleanContent.replace(`<@${client.user.id}>`, '').trim();

  const otherMention = message.mentions.users.find(u => u.id !== client.user.id);
  if (otherMention) {
    const mentionRegex = new RegExp(`<@!?${otherMention.id}>`, 'g');
    userMessage = userMessage.replace(mentionRegex, `[الشخص: ${otherMention.username}]`).trim();
  }

  if (!userMessage) {
    const defaultReply = isBatman ? 'نعم يا بات... أنا هنا' : isJoker ? 'ماذا تريد أيها المهرج؟' : isCop ? 'ماذا تريد أيها الشرطي الفاسد؟' : isMohammed ? 'أهلاً محمد، كيف حالك؟' : `ماذا تريد؟`;
    return message.reply(defaultReply);
  }

  await message.channel.sendTyping();

  // نظام الرياكشنات النادرة جداً (25% لباتمان، 5% للبقية)
  try {
    const randomRoll = Math.random();
    if (isBatman) {
      if (randomRoll < 0.25) await message.react('💋'); 
    } else {
      if (randomRoll < 0.05) { 
        if (isJoker) await message.react('🐈‍⬛');
        else await message.react('🐾');
      }
    }
  } catch(e) {
    console.error('Reaction Error:', e);
  }

  const randomDelay = Math.floor(Math.random() * (3500 - 2000) + 2000);

  setTimeout(async () => {
    let reply = await getCatwomanReply(
      message.channel.id,
      message.author.username,
      userMessage,
      persona
    );

    // تم حذف سطر المنشن التلقائي المكرر ليكون الرد بالريبلاي النظيف فقط
    message.reply(reply);
  }, randomDelay);
});

client.login(process.env.DISCORD_TOKEN);