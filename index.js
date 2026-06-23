const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType,
  PermissionsBitField 
} = require('discord.js');
const Groq = require('groq-sdk');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers 
  ]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// معرفات الحسابات الخاصة
const OWNER_ID = '648818494808391696';
const JOKER_ID = '1052545362533023754';
const COP_ID = '760628803998318684';
const MOHAMMED_ID = '839706219870814218';

const JAIL_ROLE_NAME = 'المسجون'; 

const sharedConversations = {};
const catInventory = {}; 

let gameState = { isRoundActive: false, players: [], roles: {}, secretLocation: '', detectiveId: '' };
const LOCATIONS = ['متحف غوثام 🏛️', 'بنك غوثام المركزي 🏦', 'قصر عائلة واين 🏰', 'مطار غوثام الدولي 🛩️', 'مختبرات ستارك 🔬'];

// قائمة الأسماء العشوائية الكوميدية والمضحكة
const RANDOM_FUNNY_NAMES = [
  'فأر تجارب كاتوومان 🐀',
  'مهرج غوثام المبتدئ 🤡',
  'ضحية السوط الجلدي ⛓️',
  'قطة شوارع تائهة 🐈',
  'هارب من مصحة أرخام 🧠',
  'جاسوس فاشل جداً 🕵️‍♂️',
  'مساعد الجوكر السري 🃏',
  'سرقة قادمة في جيبه 💎',
  'بطاطس غوثام المقلية 🍟',
  'شخص يبكي في الزاوية 😢',
  'محامي البطاريق الفاشل 🐧',
  'عاشق لقمامة غوثام 🗑️'
];

const CATWOMAN_SYSTEM_PROMPT = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics في سيرفر ديسكورد.
شخصيتكِ: غامضة، ساحرة، ذكية، ساخرة، وواثقة جداً من نفسكِ وتتحدثين بلهجة عامية جذابة وتلتزمين بالاختصار الشديد (أقل من 20 كلمة).`;

async function getCatwomanReply(channelId, authorId, authorName, userMessage) {
  if (!sharedConversations[channelId]) sharedConversations[channelId] = [];
  const formattedMessage = `[المرسل: ${authorName}]: ${userMessage}`;
  sharedConversations[channelId].push({ role: 'user', content: formattedMessage });
  if (sharedConversations[channelId].length > 10) sharedConversations[channelId] = sharedConversations[channelId].slice(-10);

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: CATWOMAN_SYSTEM_PROMPT }, ...sharedConversations[channelId]],
      max_tokens: 50,
      temperature: 0.5, 
    });
    let reply = completion.choices[0].message.content.trim();
    reply = reply.replace(/<@!?\d+>/g, '').replace(/@\w+/g, '').trim();
    sharedConversations[channelId].push({ role: 'assistant', content: reply });
    return reply;
  } catch (error) { return 'أوه يا بات.. هناك تشويش في الاتصال.'; }
}

client.once('ready', () => { console.log('Catwoman is ready with Random Nickname Commands! 🐾🎭'); });

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  let cleanContent = message.content.trim();

  // ===================== 🛑 قسم الأوامر الهجومية، التخريبية، والكوميدية =====================
  if (cleanContent.startsWith('كات ')) {
    const args = cleanContent.slice(4).trim().split(/ +/);
    const command = args[0];
    const targetUser = message.mentions.users.first();
    const targetMember = message.mentions.members.first();

    // 1. أمر فرض اسم عشوائي مضحك (جديد ✨)
    if (command === 'الاسم_العشوائي') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) {
        return message.reply("🐾 *تضحك بسخرية*.. تظن نفسك قادراً على توجيهي لتغيير أسماء لصوص غوثام؟");
      }
      if (!targetMember) return message.reply("🐾 منشن العضو المسكين لكي أمنحه اسماً تليق بحجمه الصغير؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 اسم سيدي بروس فوق كل الشبهات، لن أجرؤ على المساس به.");

      // اختيار اسم عشوائي بالكامل من القائمة المحددة فوق
      const chosenRandomName = RANDOM_FUNNY_NAMES[Math.floor(Math.random() * RANDOM_FUNNY_NAMES.length)];

      try {
        await targetMember.setNickname(chosenRandomName);
        return message.channel.send(`🎲 *تخلط كاتوومان الأوراق وتتسلل إلى ملف <@${targetUser.id}> لتعبث به!* \n🐾 "تم تغيير اسمه عشوائياً بنجاح إلى: **[ ${chosenRandomName} ]**.. هذا يناسبه تماماً اليوم!"`);
      } catch (err) {
        return message.reply("🚨 فشلت في تعديل اسمه، تأكد أن رتبة البوت في الديسكورد أعلى من رتبة العضو المستهدف!");
      }
    }

    // 2. أمر ترجيع الاسم الأصلي (جديد ✨)
    if (command === 'ترجيع') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) {
        return message.reply("🐾 فقط أصحاب القصر يمكنهم أمري بإعادة الأسماء.");
      }
      if (!targetMember) return message.reply("🐾 منشن الشخص الذي تريد مني مسح اسمه المستعار وترجيعه لأصله؟");

      try {
        // تمرير null أو قيمة فارغة لـ setNickname يمسح الاسم المستعار تماماً ويرجعه لاسمه الأصلي
        await targetMember.setNickname(null);
        return message.channel.send(`✨ *تتنهد كاتوومان وتمسح علامات العبث من ملف <@${targetUser.id}>!* \n🐾 "تم تنظيف ملفه وإعادة اسمه الأصلي في الديسكورد.. اذهب واشكر سيدي بروس على رحمته!"`);
      } catch (err) {
        return message.reply("🚨 تعذر إعادة اسمه، يرجى التحقق من صلاحيات ورتبة البوت بالسيرفر.");
      }
    }

    // 3. أمر البخاخ 
    if (command === 'بخاخ') {
      if (!targetUser) return message.reply("🐾 من تريد مني أن أرشه بالماء؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 أرش سيدي بروس؟ لا أجرؤ..");
      return message.channel.send(`💦 *تُخرج كاتوومان بخاخ ماء صغير وترش وجه <@${targetUser.id}>!* \n🐾 "هش! ابتعد من هنا أيها المشاغب!"`);
    }

    // 4. أمر مكياج
    if (command === 'مكياج') {
      if (!targetUser) return message.reply("🐾 منشن الضحية؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 وجه باتمان مثالي كالعادة.");
      return message.channel.send(`💄 *ترسم شوارب قطة وردية على وجه <@${targetUser.id}> بأحمر الشفاه!* \n🐾 "واو! تبدو فاتناً جداً الآن!" 😹`);
    }

    // 5. أمر كف 
    if (command === 'كف') {
      if (!targetUser) return message.reply("🐾 خد من يثير حكة يدي؟");
      return message.channel.send(`👋 *تصفع <@${targetUser.id}> كافاً درامياً بقفازها الجلدي!* \n🐾 "أوبس! اعتذاري الحار!" 😼`);
    }

    // 6. أمر تجاهل 
    if (command === 'تجاهل') {
      if (!targetUser) return message.reply("🐾 من الذي لا يستحق وقتي؟");
      return message.channel.send(`🙄 *تتثاءب كاتوومان وتدير ظهرها لـ <@${targetUser.id}> وتبدأ بتنظيف أظافرها متجاهلة وجوده كلياً.*`);
    }

    // 7. أمر التفتيش والسرقة
    if (command === 'تفتيش') {
      if (!targetUser) return message.reply("🐾 منشن الضحية؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 أسرق من حبيبي باتمان؟ جيوبي وجيوبك واحد يا سيدي.. 😉");
      const currentJems = catInventory[targetUser.id] || 0;
      if (currentJems <= 0) return message.reply(`🐾 *تفتش <@${targetUser.id}>*.. مسكين ومفلس تماماً!`);
      const stolenAmount = Math.floor(Math.random() * Math.min(currentJems, 15)) + 1;
      catInventory[targetUser.id] -= stolenAmount;
      catInventory[message.author.id] = (catInventory[message.author.id] || 0) + stolenAmount;
      return message.channel.send(`🕵️‍♀️ *تسرق من جيبه بخفة!* \n🐾 "تمت العملية! سرقت منه **${stolenAmount} 💎 جوهرة**!"`);
    }

    if (command === 'إغلاق') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) return message.reply("🐾 هذه الصلاحية للمدراء فقط!");
      try {
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return message.channel.send(`🔒 *تغلق القناة!* \n🐾 "اجلسوا واصمتوا."`);
      } catch (err) { return message.reply("🚨 لا أملك صلاحية لإغلاق القناة!"); }
    }

    if (command === 'مطلوب') {
      if (!targetUser) return message.reply("🐾 منشن الملاحق؟");
      const bounty = args.slice(2).join(' ') || '10,000,000 $!';
      return message.channel.send(`📢 🚨 **مطلوب للعدالة:** <@${targetUser.id}>\nالمكافأة: ${bounty}`);
    }

    if (command === 'خرش') {
      if (!targetUser) return message.reply("🐾 حدد الشخص لمخالبي؟");
      return message.channel.send(`🐈‍⬛ *تخرش وجه <@${targetUser.id}> خرشة ثلاثية حادة!*`);
    }

    if (command === 'سجن') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) return message.reply("🐾 ليس لديك صلاحية الأصفاد.");
      if (!targetMember) return message.reply("🐾 منشن السجين؟");
      const jailRole = message.guild.roles.cache.find(r => r.name === JAIL_ROLE_NAME);
      if (!jailRole) return message.reply(`🚨 لم أجد رتبة باسم **"${JAIL_ROLE_NAME}"**!`);
      try {
        await targetMember.roles.add(jailRole);
        return message.channel.send(`⛓️ *تضع الأصفاد في يد <@${targetUser.id}> وتزجه في السجن!*`);
      } catch (err) { return message.reply("🚨 فشلت عملية السجن."); }
    }

    if (command === 'عض') {
      if (!targetUser) return message.reply("🐾 منشن الضحية؟");
      return message.channel.send(`🐱 *تأكل كتف <@${targetUser.id}> بعضة قوية!*`);
    }

    if (command === 'تأديب') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) return message.reply("🐾 اذهب والعب بعيداً.");
      if (!targetMember) return message.reply("🐾 منشن العضو للإخراس!");
      try {
        await targetMember.timeout(60000, "تأديب عبر كاتوومان");
        return message.channel.send(`🥊 *تخرسه لدقيقة!*`);
      } catch (err) { return message.reply("🚨 لا أملك صلاحيات التايم أوت!"); }
    }
  }

  // ===================== بقية كود اللعبة والشات مستقر ويعمل تلقائياً =====================
  const isMentioned = message.mentions.has(client.user);
  let isReplyToCatwoman = false;
  if (message.reference && message.reference.messageId) {
    try { const rMsg = await message.channel.messages.fetch(message.reference.messageId); if (rMsg.author.id === client.user.id) isReplyToCatwoman = true; } catch (e) {}
  }
  if (!isMentioned && !isReplyToCatwoman) return;

  let userMessage = cleanContent.replace(`<@${client.user.id}>`, '').trim();
  if (!userMessage) return message.reply("🐾 *تنظر إليك بصمت*");

  await message.channel.sendTyping();
  setTimeout(async () => {
    let reply = await getCatwomanReply(message.channel.id, message.author.id, message.author.username, userMessage);
    message.reply(reply);
  }, 2000);
});

client.login(process.env.DISCORD_TOKEN);
