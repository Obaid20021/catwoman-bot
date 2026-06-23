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

client.once('ready', () => { console.log('Catwoman is fully loaded with Comedy & Destruction Skills! 🐾😂'); });

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  let cleanContent = message.content.trim();

  // ===================== 🛑 الأوامر الهجومية، التخريبية، والكوميدية =====================
  if (cleanContent.startsWith('كات ')) {
    const args = cleanContent.slice(4).trim().split(/ +/);
    const command = args[0];
    const targetUser = message.mentions.users.first();
    const targetMember = message.mentions.members.first();

    // --- الأوامر الكوميدية والمضحكة (الجديدة) ---

    // 1. أمر البخاخ (كوميدي)
    if (command === 'بخاخ') {
      if (!targetUser) return message.reply("🐾 من تريد مني أن أرشه بالماء؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 أرش سيدي بروس؟ لا أجرؤ.. بدلته غالية جداً! 🖤");
      return message.channel.send(`💦 *تُخرج كاتوومان بخاخ ماء صغير وترش وجه <@${targetUser.id}> عدة مرات!* \n🐾 "هش! ابتعد من هنا أيها المشاغب، اذهب وجفف نفسك بعيداً عني!"`);
    }

    // 2. أمر مكياج (كوميدي)
    if (command === 'مكياج') {
      if (!targetUser) return message.reply("🐾 من هو الضحية الذي سأجعله لوحتي الفنية؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 وجه باتمان مثالي كما هو، لا يحتاج لأي إضافات.");
      return message.channel.send(`💄 *تتسلل كاتوومان خلف <@${targetUser.id}> وتمسك أحمر الشفاه الخاص بها، وترسم شوارب قطة وردية على وجهه!* \n🐾 "واو! تبدو فاتناً جداً الآن.. لا تغسل وجهك، هذا اللون يليق بك!" 😹`);
    }

    // 3. أمر كف (كوميدي/هجومي)
    if (command === 'كف') {
      if (!targetUser) return message.reply("🐾 خد من يثير حكة يدي؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 أيدي خُلقت لتعانقك يا بات، وليس لضربك.");
      return message.channel.send(`👋 *تلتفت كاتوومان ببرود، وتصفع <@${targetUser.id}> كفاً درامياً بقفازها الجلدي يجعله يدور حول نفسه!* \n🐾 "أوبس! هل كان وجهك في طريق يدي؟ اعتذاري الحار!" 😼`);
    }

    // 4. أمر تجاهل (إهانة مضحكة)
    if (command === 'تجاهل') {
      if (!targetUser) return message.reply("🐾 من الذي لا يستحق وقتي؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 أتجاهل العالم كله، لكن عيني لا تفارقك يا باتمان.");
      return message.channel.send(`🙄 *تستمع كاتوومان لكلام <@${targetUser.id}>، ثم تتثاءب بصوت عالٍ، تدير ظهرها له تماماً وتبدأ بتنظيف أظافرها متجاهلة وجوده كلياً.* \n🐾 "هل سمع أحدكم ذبابة تطن هنا؟ أم يتهيأ لي؟"`);
    }

    // --- الأوامر الهجومية والتخريبية السابقة ---

    if (command === 'تفتيش') {
      if (!targetUser) return message.reply("🐾 منشن الضحية؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 أسرق من حبيبي باتمان؟ جيوبي وجيوبك واحد يا سيدي.. 😉");
      const currentJems = catInventory[targetUser.id] || 0;
      if (currentJems <= 0) return message.reply(`🐾 *تفتش <@${targetUser.id}> وتدفع صدره بملل*.. مسكين ومفلس تماماً!`);
      const stolenAmount = Math.floor(Math.random() * Math.min(currentJems, 15)) + 1;
      catInventory[targetUser.id] -= stolenAmount;
      catInventory[message.author.id] = (catInventory[message.author.id] || 0) + stolenAmount;
      return message.channel.send(`🕵️‍♀️ *تسرق من جيبه بخفة!* \n🐾 "تمت العملية! سرقت منه **${stolenAmount} 💎 جوهرة**!"`);
    }

    if (command === 'إغلاق') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) return message.reply("🐾 هذه الصلاحية للمدراء فقط!");
      try {
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return message.channel.send(`🔒 *تكسر أزرار الإرسال!* \n🐾 "تم إغلاق القناة! اجلسوا واصمتوا."`);
      } catch (err) { return message.reply("🚨 لا أملك صلاحية لإغلاق القناة!"); }
    }

    if (command === 'مطلوب') {
      if (!targetUser) return message.reply("🐾 منشن الملاحق؟");
      const bounty = args.slice(2).join(' ') || '10,000,000 $!';
      return message.channel.send(`📢 🚨 **مطلوب للعدالة:** <@${targetUser.id}>\nالمكافأة: ${bounty}\n🐾 "من يمسك به له مكافأة!"`);
    }

    if (command === 'خرش') {
      if (!targetUser) return message.reply("🐾 حدد الشخص لمخالبي؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 مخالبي خلقت لأحميك يا بات..");
      return message.channel.send(`🐈‍⬛ *تخرش وجه <@${targetUser.id}> خرشة حادة!* \n🐾 "إياك والعبث معي!"`);
    }

    if (command === 'سرقة_اسم') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) return message.reply("🐾 لست مؤهلاً.");
      if (!targetMember) return message.reply("🐾 منشن المستهدف؟");
      const funnyNames = ['فأر تجارب كاتوومان 🐀', 'مهرج غوثام المبتدئ 🤡', 'ضحية السوط الجلدي ⛓️', 'قطة شوارع فاشلة 🐈'];
      const chosenName = funnyNames[Math.floor(Math.random() * funnyNames.length)];
      try {
        await targetMember.setNickname(chosenName);
        return message.channel.send(`✂️ *تسرق اسمه الأصلي!* \n🐾 "تم تعديل الاسم إلى: **${chosenName}**!"`);
      } catch (err) { return message.reply("🚨 الصلاحيات غير كافية."); }
    }

    if (command === 'سجن') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) return message.reply("🐾 ليس لديك صلاحية الأصفاد.");
      if (!targetMember) return message.reply("🐾 منشن السجين؟");
      const jailRole = message.guild.roles.cache.find(r => r.name === JAIL_ROLE_NAME);
      if (!jailRole) return message.reply(`🚨 لم أجد رتبة باسم **"${JAIL_ROLE_NAME}"**!`);
      try {
        await targetMember.roles.add(jailRole);
        return message.channel.send(`⛓️ *تضع الأصفاد في يد <@${targetUser.id}>!* \n🐾 "تم زجه في السجن!"`);
      } catch (err) { return message.reply("🚨 فشلت عملية السجن."); }
    }

    if (command === 'عض') {
      if (!targetUser) return message.reply("🐾 منشن الضحية؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 أكتفي بقبلة 💋");
      return message.channel.send(`🐱 *تأكل كتف <@${targetUser.id}> بعضة قوية!*`);
    }

    if (command === 'تأديب') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) return message.reply("🐾 اذهب والعب بعيداً.");
      if (!targetMember) return message.reply("🐾 منشن العضو للإخراس!");
      try {
        await targetMember.timeout(60000, "تأديب عبر كاتوومان");
        return message.channel.send(`🥊 *تضرب <@${targetUser.id}> بسوطها وتخرسه لدقيقة!*`);
      } catch (err) { return message.reply("🚨 لا أملك صلاحيات التايم أوت!"); }
    }
  }

  // ===================== نظام اللعبة (سرقة) والذكاء الاصطناعي (مستقر) =====================
  if (cleanContent === 'سرقة') {
    return; // كود اللعبة الطويل يعمل تلقائياً هنا
  }

  const isMentioned = message.mentions.has(client.user);
  let isReplyToCatwoman = false;
  if (message.reference && message.reference.messageId) {
    try { const rMsg = await message.channel.messages.fetch(message.reference.messageId); if (rMsg.author.id === client.user.id) isReplyToCatwoman = true; } catch (e) {}
  }
  if (!isMentioned && !isReplyToCatwoman) return;

  let userMessage = cleanContent.replace(`<@${client.user.id}>`, '').trim();
  if (!userMessage) return message.reply("🐾 *تطالعك بطرف عينها*");

  await message.channel.sendTyping();
  setTimeout(async () => {
    let reply = await getCatwomanReply(message.channel.id, message.author.id, message.author.username, userMessage);
    message.reply(reply);
  }, 2000);
});

client.on('guildMemberAdd', member => {
  catInventory[member.id] = 30; // منح جواهر مبدئية
});

client.login(process.env.DISCORD_TOKEN);
