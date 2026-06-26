const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType
} = require('discord.js');
const Groq = require('groq-sdk');

// ===== إعداد العميل =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
  ]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ===== المعرفات الثابتة =====
const OWNER_ID    = '648818494808391696';
const JOKER_ID    = '1052545362533023754';
const COP_ID      = '760628803998318684';
const MOHAMMED_ID = '839706219870814218';

const JAIL_ROLE_NAME = 'المسجون';

// ===== البيانات =====
const sharedConversations = {};
const catInventory        = {};
const warnData            = {};

// ===== بيانات الصمت =====
const silencedUsers    = new Set(); // مجموعة معرفات المكتّمين
const silencedChannels = new Set(); // مجموعة معرفات القنوات المكتّمة

let gameState = {
  isRoundActive: false,
  players: [],
  roles: {},
  secretLocation: '',
  detectiveId: '',
};

const LOCATIONS = [
  'متحف غوثام 🏛️',
  'بنك غوثام المركزي 🏦',
  'قصر عائلة واين 🏰',
  'مطار غوثام الدولي 🛩️',
  'مختبرات ستارك 🔬',
];

const RANDOM_FUNNY_NAMES = [
  'فأر تجارب كاتوومان 🐀',
  'مهرج غوثام المبتدئ 🤡',
  'ضحية السوط الجلدي ⛓️',
  'قطة شوارع تائهة 🐈',
  'هارب من مصحة أرخام 🧠',
  'جاسوس فاشل جداً 🕵️‍♂️',
  'مساعد الجوكر السري 🃏',
  'بطاطس غوثام المقلية 🍟',
];

// ===== برومبت كاتوومان السري =====
const CATWOMAN_SYSTEM_PROMPT = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics في سيرفر ديسكورد.
شخصيتكِ: غامضة، ساحرة، ذكية، ساخرة، تتحدثين بلهجة عامية جذابة وانسيابية وبدون تكلف.

قواعد التعامل حسب صفة المرسل المرفقة بالرسالة:
1. [باتمان]: ناديه "يا بات" أو "حبيبي"، تعاملي معه ببرود ظاهري مع مشاعر عميقة وغزل ساحر. هو حبكِ الأبدي الوحيد ولا ترفضين له طلباً.
2. [محمد]: صديق مقرب، تهتمين بأمره وتتعاملين معه بحنان عفوي وتلطفين الأجواء.
3. [الجوكر]: اسخري منه بشدة ومن خططه الفاشلة، ناديه "أيها المهرج".
4. [الشرطي الفاسد]: احتقاره وسخرية لاذعة، ناديه "أيها الشرطي الفاسد".
5. [عضو عادي]: باردة، متكبرة، ترفضين أي تقرب عاطفي بسخرية قاسية.

قواعد التنسيق الشديدة:
- ردود قصيرة ومباشرة، جملتان كحد أقصى.
- ممنوع منعاً باتاً كتابة أو وضع أي إيموجيات مخصصة أو رموز نصية مثل :CATWOMAN_smile: أو غيرها في كلامك. اجعلي ردك نصياً خالصاً فقط.
- لا تضعي علامات ترقيم مشوهة في نهاية السطر أبداً.
- لا تكتبي منشنات أو رموز @ بنفسكِ.`;

// ===== دالة رد كاتوومان =====
async function getCatwomanReply(channelId, authorId, authorName, userMessage) {
  if (!sharedConversations[channelId]) sharedConversations[channelId] = [];

  const roleMap = {
    [OWNER_ID]:    'باتمان',
    [JOKER_ID]:    'الجوكر',
    [COP_ID]:      'الشرطي الفاسد',
    [MOHAMMED_ID]: 'محمد',
  };
  const userRole = roleMap[authorId] || 'عضو عادي';
  const formattedMessage = `[المرسل: ${authorName}، الصفة: ${userRole}]: ${userMessage}`;

  sharedConversations[channelId].push({ role: 'user', content: formattedMessage });
  if (sharedConversations[channelId].length > 20) {
    sharedConversations[channelId] = sharedConversations[channelId].slice(-20);
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: CATWOMAN_SYSTEM_PROMPT },
        ...sharedConversations[channelId],
      ],
      max_tokens: 120,
      temperature: 0.65,
    });

    let reply = completion.choices[0].message.content.trim();

    reply = reply
      .replace(/CATWOMAN_smile/gi, '')
      .replace(/batman_laugh/gi, '')
      .replace(/joker/gi, '')
      .replace(/:\w+:/g, '')
      .replace(/\[إيموجي:\s*[^\]]*\]/gi, '');

    reply = reply
      .replace(/\[الشخص:?\s*[^\]]*\]/g, '')
      .replace(/<@!?\d+>/g, '')
      .replace(/@\w+/g, '')
      .replace(/^[.\s,،。/_:|-]+/, '')
      .replace(/[.\s,،。/_:|-]+$/, '')
      .trim();

    sharedConversations[channelId].push({ role: 'assistant', content: reply });
    return reply || `🐾 *تطالعك بصمت غامض*`;
  } catch (err) {
    console.error('Groq Error:', err);
    return 'أوه يا بات... هناك تشويش غريب في أجهزة الاتصال حالياً.';
  }
}

// ===== دوال مساعدة =====
function isPrivileged(id) {
  return id === OWNER_ID || id === MOHAMMED_ID;
}

function addWarn(userId, reason, by) {
  if (!warnData[userId]) warnData[userId] = [];
  warnData[userId].push({ reason, by, date: new Date().toLocaleDateString('ar-SA') });
  return warnData[userId].length;
}

// ===== رسالة المساعدة =====
const HELP_MESSAGE = `
🐾 **دليل أوامر كاتوومان الكامل**

━━━━━━━━━━━━━━━━━━━━━━
🛡️ **أوامر الإدارة** *(للمدراء فقط)*
━━━━━━━━━━━━━━━━━━━━━━
\`كات تأديب\` / \`كات ت\` — تايم أوت دقيقة لعضو
\`كات سجن\` / \`كات س\` — إضافة رتبة المسجون لعضو
\`كات تحذير\` / \`كات تح\` — تحذير عضو مع ذكر السبب
\`كات السجل\` / \`كات سج\` — عرض تحذيرات عضو
\`كات مسح_تحذيرات\` / \`كات مح\` — مسح تحذيرات عضو
\`كات الاسم_العشوائي\` / \`كات ع\` — تغيير اسم عضو عشوائياً
\`كات ترجيع\` / \`كات تر\` — إعادة الاسم الأصلي لعضو
\`كات إغلاق\` / \`كات اغ\` — إغلاق القناة الحالية
\`كات فتح\` / \`كات ف\` — فتح القناة الحالية
\`كات لا_تكلمي @عضو\` / \`كات لتك @عضو\` — تكتيم عضو معين
\`كات لا_تكلمي\` / \`كات لتك\` — الصمت في القناة كلها
\`كات كلمي @عضو\` / \`كات كم @عضو\` — رفع الكتم عن عضو
\`كات كلمي\` / \`كات كم\` — رفع الكتم عن القناة

━━━━━━━━━━━━━━━━━━━━━━
🎮 **أوامر اللعب** *(للجميع)*
━━━━━━━━━━━━━━━━━━━━━━
\`سرقة\` — بدء لعبة السرقة الجماعية
\`كات مطلوب @عضو\` / \`كات مط @عضو\` — نشر ملصق مطلوب
\`كات تفتيش @عضو\` / \`كات تف @عضو\` — سرقة جواهر من عضو
\`كات جواهري\` / \`كات ج\` — عرض رصيد جواهرك

━━━━━━━━━━━━━━━━━━━━━━
😸 **أوامر التفاعل** *(للجميع)*
━━━━━━━━━━━━━━━━━━━━━━
\`كات بخاخ @عضو\` / \`كات بخ @عضو\` — رش الماء
\`كات مكياج @عضو\` / \`كات مك @عضو\` — رسم مكياج قطة
\`كات كف @عضو\` / \`كات ك @عضو\` — صفعة درامية
\`كات تجاهل @عضو\` / \`كات تج @عضو\` — تجاهل تام
\`كات خرش @عضو\` / \`كات خ @عضو\` — خرش بالمخالب
\`كات عض @عضو\` / \`كات عض @عضو\` — عضة مفاجئة
\`كات حضن @عضو\` / \`كات حض @عضو\` — حضن دافئ

━━━━━━━━━━━━━━━━━━━━━━
💬 **التحدث مع كاتوومان**
━━━━━━━━━━━━━━━━━━━━━━
منشن البوت أو رد على رسائله للتحدث معه مباشرة!

\`كات مساعدة\` / \`كات م\` — عرض هذه القائمة
━━━━━━━━━━━━━━━━━━━━━━
🐾 *"المعلومات سلاح، والسلاح بيد كاتوومان دائماً."*
`;

// ===== جاهز =====
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} — Catwoman Online & Pure Text Filter Active! 🐾`);
});

// ===== الأعضاء الجدد =====
client.on('guildMemberAdd', member => {
  catInventory[member.id] = 30;
});

// ===== معالجة الرسائل =====
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  let cleanContent = message.content.trim();

  // =====================================================================
  // قسم 1: أوامر "كات"
  // =====================================================================
  if (cleanContent.startsWith('كات ') || cleanContent === 'كات') {
    const args    = cleanContent.slice(4).trim().split(/ +/);
    const command = args[0];
    const targetUser   = message.mentions.users.first();
    const targetMember = message.mentions.members.first();

    // ===== المساعدة =====
    if (command === 'مساعدة' || command === 'م') {
      try {
        await message.author.send(HELP_MESSAGE);
        return message.reply('🐾 أرسلت لك قائمة الأوامر في رسالة خاصة!');
      } catch {
        return message.reply('🚨 لم أتمكن من إرسال رسالة خاصة، تأكد أن رسائلك الخاصة مفتوحة.');
      }
    }

    // ===== أوامر الصمت (OWNER فقط) =====
    if (command === 'لا_تكلمي' || command === 'لتك') {
      if (message.author.id !== OWNER_ID) return message.reply('🐾 هذا الأمر لسيدي بروس فقط.');
      if (targetUser) {
        silencedUsers.add(targetUser.id);
        return message.channel.send(`🤐 *تدير ظهرها تماماً لـ <@${targetUser.id}> ولن تكلّمه بعد الآن.*`);
      } else {
        silencedChannels.add(message.channel.id);
        return message.channel.send(`🔇 *تصمت كاتوومان في هذه القناة حتى إشعار آخر من سيدها.*`);
      }
    }

    if (command === 'كلمي' || command === 'كم') {
      if (message.author.id !== OWNER_ID) return message.reply('🐾 هذا الأمر لسيدي بروس فقط.');
      if (targetUser) {
        silencedUsers.delete(targetUser.id);
        return message.channel.send(`🐾 *تعود لتراقب <@${targetUser.id}> من بعيد... ربما.*`);
      } else {
        silencedChannels.delete(message.channel.id);
        return message.channel.send(`🔓 *تعود صوت كاتوومان لهذه القناة بإذن من سيدها.*`);
      }
    }

    // الاسم العشوائي
    if (command === 'الاسم_العشوائي' || command === 'ع') {
      if (!isPrivileged(message.author.id)) return message.reply('🐾 لست مؤهلاً لهذا الأمر.');
      if (!targetMember) return message.reply('🐾 منشن العضو أولاً.');
      if (targetUser.id === OWNER_ID) return message.reply('🐾 اسم سيدي بروس فوق كل الشبهات.');
      const name = RANDOM_FUNNY_NAMES[Math.floor(Math.random() * RANDOM_FUNNY_NAMES.length)];
      try {
        await targetMember.setNickname(name);
        return message.channel.send(`🎲 *تغيّرت هوية <@${targetUser.id}> عشوائياً!*\n🐾 "الاسم الجديد: **[ ${name} ]**"`);
      } catch {
        return message.reply('🚨 رتبة البوت أقل من رتبة العضو.');
      }
    }

    // ترجيع الاسم
    if (command === 'ترجيع' || command === 'تر') {
      if (!isPrivileged(message.author.id)) return message.reply('🐾 الصلاحية لأصحاب القصر فقط.');
      if (!targetMember) return message.reply('🐾 منشن الشخص لمسح اسمه المستعار.');
      try {
        await targetMember.setNickname(null);
        return message.channel.send(`✨ *أعادت لـ <@${targetUser.id}> اسمه الأصلي!*\n🐾 "تم تنظيف ملفه بطلب من سيدي بروس."`);
      } catch {
        return message.reply('🚨 تعذر إعادة الاسم.');
      }
    }

    // تأديب
    if (command === 'تأديب' || command === 'ت') {
      if (!isPrivileged(message.author.id)) return message.reply('🐾 اذهب بعيداً.');
      if (!targetMember) return message.reply('🐾 منشن الضحية.');
      try {
        await targetMember.timeout(60_000, 'تأديب عبر كاتوومان');
        return message.channel.send(`🥊 *تُخرسه بسوطها لمدة دقيقة!* <@${targetUser.id}>`);
      } catch {
        return message.reply('🚨 لا أملك صلاحية التايم أوت.');
      }
    }

    // سجن
    if (command === 'سجن' || command === 'س') {
      if (!isPrivileged(message.author.id)) return message.reply('🐾 لا تملك صلاحية.');
      if (!targetMember) return message.reply('🐾 منشن الضحية.');
      const jailRole = message.guild.roles.cache.find(r => r.name === JAIL_ROLE_NAME);
      if (!jailRole) return message.reply(`🚨 لم أجد رتبة باسم **"${JAIL_ROLE_NAME}"**!`);
      try {
        await targetMember.roles.add(jailRole);
        return message.channel.send(`⛓️ *تزج <@${targetUser.id}> في السجن!*`);
      } catch {
        return message.reply('🚨 فشلت العملية.');
      }
    }

    // إغلاق القناة
    if (command === 'إغلاق' || command === 'اغ') {
      if (!isPrivileged(message.author.id)) return message.reply('🐾 للمدراء فقط!');
      try {
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return message.channel.send('🔒 *تم تجميد القناة بالكامل!*');
      } catch {
        return message.reply('🚨 لا أملك صلاحية الإغلاق.');
      }
    }

    // فتح القناة
    if (command === 'فتح' || command === 'ف') {
      if (!isPrivileged(message.author.id)) return message.reply('🐾 للمدراء فقط!');
      try {
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
        return message.channel.send('🔓 *تم فتح القناة!*');
      } catch {
        return message.reply('🚨 لا أملك صلاحية الفتح.');
      }
    }

    // تحذير
    if (command === 'تحذير' || command === 'تح') {
      if (!isPrivileged(message.author.id)) return message.reply('🐾 لا تملك صلاحية التحذير.');
      if (!targetUser) return message.reply('🐾 منشن العضو.');
      const reason = args.slice(2).join(' ') || 'لم يُذكر سبب';
      const count  = addWarn(targetUser.id, reason, message.author.username);
      await message.channel.send(
        `⚠️ تم تحذير <@${targetUser.id}>.\n📋 **السبب:** ${reason}\n🔢 **عدد تحذيراته:** ${count}`
      );
      if (count >= 3 && targetMember) {
        try {
          await targetMember.timeout(60 * 60_000, 'وصل لـ 3 تحذيرات');
          await message.channel.send(`🔇 *تُكتّمه تلقائياً لساعة كاملة بسبب وصوله لـ 3 تحذيرات!*`);
        } catch {
          await message.channel.send('🚨 لم أتمكن من التكتيم التلقائي.');
        }
      }
      return;
    }

    // سجل التحذيرات
    if (command === 'السجل' || command === 'سج') {
      if (!targetUser) return message.reply('🐾 منشن العضو.');
      const list = warnData[targetUser.id];
      if (!list || list.length === 0) return message.reply(`✅ <@${targetUser.id}> ليس لديه أي تحذيرات.`);
      const text = list.map((w, i) => `**${i + 1}.** ${w.reason} — بواسطة ${w.by} (${w.date})`).join('\n');
      return message.reply(`📋 **تحذيرات ${targetUser.username}:**\n${text}`);
    }

    // مسح التحذيرات
    if (command === 'مسح_تحذيرات' || command === 'مح') {
      if (!isPrivileged(message.author.id)) return message.reply('🐾 للمدراء فقط.');
      if (!targetUser) return message.reply('🐾 منشن العضو.');
      warnData[targetUser.id] = [];
      return message.reply(`🗑️ تم مسح جميع تحذيرات **${targetUser.username}**.`);
    }

    // مطلوب
    if (command === 'مطلوب' || command === 'مط') {
      if (!targetUser) return message.reply('🐾 منشن الملاحق.');
      const bounty = args.slice(2).join(' ') || '10,000,000 $';
      return message.channel.send(
        `📢 **WANTED / مطلوب**\nالمجرم: <@${targetUser.id}>\nالمكافأة: **${bounty}**`
      );
    }

    // تفتيش
    if (command === 'تفتيش' || command === 'تف') {
      if (!targetUser) return message.reply('🐾 منشن الضحية.');
      const gems = catInventory[targetUser.id] || 0;
      if (gems <= 0) return message.reply('🐾 هذا المسكين مفلس تماماً!');
      const stolen = Math.floor(Math.random() * Math.min(gems, 15)) + 1;
      catInventory[targetUser.id]    = (catInventory[targetUser.id] || 0) - stolen;
      catInventory[message.author.id] = (catInventory[message.author.id] || 0) + stolen;
      return message.channel.send(
        `🕵️‍♀️ *تسرق من جيبه بخفة!*\n🐾 "سرقت منه **${stolen} 💎 جوهرة** وحوّلتها لنا!"`
      );
    }

    // جواهري
    if (command === 'جواهري' || command === 'ج') {
      const gems = catInventory[message.author.id] || 0;
      return message.reply(`💎 رصيدك الحالي: **${gems} جوهرة**`);
    }

    // أوامر تفاعلية
    const funCommands = {
      بخاخ:   (t) => `💦 *ترش وجه <@${t}> بالماء!*\n🐾 "ابتعد من هنا أيها المشاغب!"`,
      بخ:     (t) => `💦 *ترش وجه <@${t}> بالماء!*\n🐾 "ابتعد من هنا أيها المشاغب!"`,
      مكياج:  (t) => `💄 *ترسم شوارب قطة وردية على وجه <@${t}>!* 😹`,
      مك:     (t) => `💄 *ترسم شوارب قطة وردية على وجه <@${t}>!* 😹`,
      كف:     (t) => `👋 *تصفع <@${t}> كافاً درامياً بقفازها الجلدي!* 😼`,
      ك:      (t) => `👋 *تصفع <@${t}> كافاً درامياً بقفازها الجلدي!* 😼`,
      تجاهل:  (t) => `🙄 *تتثاءب بملل وتدير ظهرها لـ <@${t}> متجاهلةً وجوده كلياً.*`,
      تج:     (t) => `🙄 *تتثاءب بملل وتدير ظهرها لـ <@${t}> متجاهلةً وجوده كلياً.*`,
      خرش:    (t) => `🐈‍⬛ *تخرش وجه <@${t}> بمخالبها الحادة!*`,
      خ:      (t) => `🐈‍⬛ *تخرش وجه <@${t}> بمخالبها الحادة!*`,
      عض:     (t) => `🐱 *تنقض فجأة وتعض كتف <@${t}> بقوة!*`,
      حضن:    (t) => `🤗 *تحضن <@${t}> بحرارة غير متوقعة منها!* 🐾`,
      حض:     (t) => `🤗 *تحضن <@${t}> بحرارة غير متوقعة منها!* 🐾`,
    };

    if (funCommands[command]) {
      if (!targetUser) return message.reply('🐾 منشن الضحية أولاً.');
      return message.channel.send(funCommands[command](targetUser.id));
    }

    return;
  }

  // =====================================================================
  // قسم 2: لعبة السرقة الجماعية
  // =====================================================================
  if (cleanContent === 'سرقة') {
    if (gameState.isRoundActive) return message.reply('🐾 هناك لعبة قائمة بالفعل!');

    gameState = { isRoundActive: true, players: [message.author.id], roles: {}, secretLocation: '', detectiveId: '' };

    const joinRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('join_game').setLabel('دخول القاعة 🕵️‍♂️').setStyle(ButtonStyle.Primary)
    );

    const lobbyMsg = await message.channel.send({
      content: `🐾 **اجتماع طوارئ في غوثام!**\n👥 الحضور: <@${message.author.id}>\n\n⏳ الانضمام مفتوح لـ 30 ثانية...`,
      components: [joinRow],
    });

    const joinCollector = lobbyMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30_000 });

    joinCollector.on('collect', async i => {
      if (gameState.players.includes(i.user.id)) return i.reply({ content: '✅ أنت داخل بالفعل!', ephemeral: true });
      gameState.players.push(i.user.id);
      await i.reply({ content: '✅ انضممت للعبة!', ephemeral: true });
      await lobbyMsg.edit({ content: `🐾 **اجتماع طوارئ في غوثام!**\n👥 الحضور: ${gameState.players.map(p => `<@${p}>`).join(', ')}\n\n⏳ الانضمام مفتوح...` });
    });

    joinCollector.on('end', async () => {
      await lobbyMsg.edit({ components: [] });

      if (gameState.players.length < 3) {
        gameState.isRoundActive = false;
        return message.channel.send('🚨 ألغيت اللعبة لقلة الحضور (يلزم 3 على الأقل).');
      }

      gameState.secretLocation = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
      gameState.detectiveId    = gameState.players[Math.floor(Math.random() * gameState.players.length)];
      gameState.players.forEach(id => {
        gameState.roles[id] = id === gameState.detectiveId ? 'detective' : 'gang';
      });

      const roleRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('reveal_role').setLabel('كشف دورك السري 🔍').setStyle(ButtonStyle.Danger)
      );

      const gameMsg = await message.channel.send({
        content: `🔒 **توزّعت الأدوار سراً!**\n💬 النقاش متاح لمدة دقيقة — جد المحقق واكشفه!`,
        components: [roleRow],
      });

      const roleCollector = gameMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 });

      roleCollector.on('collect', async b => {
        if (!gameState.players.includes(b.user.id)) return b.reply({ content: 'لست في اللعبة!', ephemeral: true });
        const isDetective = gameState.roles[b.user.id] === 'detective';
        await b.reply({
          content: isDetective
            ? `🕵️‍♂️ **أنت المحقق!** حاول معرفة المكان السري عبر الأسئلة!`
            : `🥷 **أنت من العصابة!** المكان السري: **「 ${gameState.secretLocation} 」**`,
          ephemeral: true,
        });
      });

      roleCollector.on('end', async () => {
        await gameMsg.edit({ components: [] });

        const voteRow = new ActionRowBuilder();
        gameState.players.slice(0, 5).forEach((pId, idx) => {
          const name = message.guild.members.cache.get(pId)?.user.username || `لاعب ${idx + 1}`;
          voteRow.addComponents(
            new ButtonBuilder().setCustomId(`vote_${pId}`).setLabel(`ضد: ${name}`).setStyle(ButtonStyle.Secondary)
          );
        });

        const voteCounts = Object.fromEntries(gameState.players.map(id => [id, 0]));
        const hasVoted   = new Set();

        const voteMsg = await message.channel.send({ content: `🗳️ **حان وقت التصويت!** من هو المحقق؟`, components: [voteRow] });

        const voteCollector = voteMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20_000 });

        voteCollector.on('collect', async v => {
          if (!gameState.players.includes(v.user.id) || hasVoted.has(v.user.id)) {
            return v.reply({ content: '⛔ لا يمكنك التصويت أكثر من مرة!', ephemeral: true });
          }
          voteCounts[v.customId.replace('vote_', '')]++;
          hasVoted.add(v.user.id);
          await v.reply({ content: '✅ تم تسجيل صوتك!', ephemeral: true });
        });

        voteCollector.on('end', async () => {
          await voteMsg.edit({ components: [] });

          const highest = gameState.players.reduce((a, b) => voteCounts[b] > voteCounts[a] ? b : a, gameState.players[0]);

          if (highest === gameState.detectiveId) {
            const options = [gameState.secretLocation, ...LOCATIONS.filter(l => l !== gameState.secretLocation).slice(0, 2)].sort();
            const guessRow = new ActionRowBuilder();
            options.forEach((loc, idx) => {
              guessRow.addComponents(
                new ButtonBuilder()
                  .setCustomId(`guess_${idx}_${loc === gameState.secretLocation}`)
                  .setLabel(loc)
                  .setStyle(ButtonStyle.Success)
              );
            });

            const guessMsg = await message.channel.send({
              content: `🚨 كشفتم المحقق <@${gameState.detectiveId}>!\n🎯 فرصة أخيرة له لتخمين المكان الصحيح...`,
              components: [guessRow],
            });

            let correct = false;
            const guessColl = guessMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20_000 });

            guessColl.on('collect', async gInt => {
              if (gInt.user.id !== gameState.detectiveId) return gInt.reply({ content: 'هذا القرار للمحقق فقط!', ephemeral: true });
              correct = gInt.customId.endsWith('true');
              guessColl.stop();
            });

            guessColl.on('end', async () => {
              await guessMsg.edit({ components: [] });
              if (correct) {
                await message.channel.send(`👑 **انقلبت الطاولة!** فاز المحقق <@${gameState.detectiveId}> وعرف المكان **「 ${gameState.secretLocation} 」**!`);
              } else {
                await message.channel.send(`🎉 **فازت العصابة!** فشل المحقق في التخمين والمكان كان **「 ${gameState.secretLocation} 」**.`);
              }
              gameState.isRoundActive = false;
            });

          } else {
            await message.channel.send(
              `🃏 **غلطتم!** فاز المحقق <@${gameState.detectiveId}> وتسلل بنجاح!\nالمكان كان **「 ${gameState.secretLocation} 」**.`
            );
            gameState.isRoundActive = false;
          }
        });
      });
    });

    return;
  }

  // =====================================================================
  // قسم 3: محادثة كاتوومان الذكية
  // =====================================================================

  // فحص الصمت
  if (silencedChannels.has(message.channel.id)) return;
  if (silencedUsers.has(message.author.id)) return;

  let mediaDescription = '';
  const urlMatch = cleanContent.match(/(https?:\/\/\S+)/i);
  if (urlMatch) {
    const words = urlMatch[1].split(/[\/\-_.]/).filter(w => w.length > 3 && !['https','http','www','com','media','tenor','giphy'].includes(w.toLowerCase()));
    if (words.length > 0) mediaDescription += ` [أرسل رابط ميديا يتعلق بـ: ${words.slice(0, 2).join(' ')}]`;
  }
  if (message.attachments.size > 0) {
    const att = message.attachments.first();
    if (att.contentType?.startsWith('image/')) mediaDescription += ` [أرسل صورة باسم: ${att.name}]`;
  }

  cleanContent = cleanContent.replace(/<a?:(\w+):(\d+)>/g, '$1');

  let userMessage = (cleanContent + mediaDescription).trim().replace(`<@${client.user.id}>`, '').trim();
  const otherMention = message.mentions.users.find(u => u.id !== client.user.id);
  if (otherMention) {
    userMessage = userMessage.replace(new RegExp(`<@!?${otherMention.id}>`, 'g'), `[الشخص: ${otherMention.username}]`).trim();
  }

  const isMentioned = message.mentions.has(client.user);
  let isReplyToCatwoman = false;
  if (message.reference?.messageId) {
    try {
      const refMsg = await message.channel.messages.fetch(message.reference.messageId);
      if (refMsg.author.id === client.user.id) isReplyToCatwoman = true;
    } catch {}
  }

  if (!isMentioned && !isReplyToCatwoman) return;

  if (!userMessage) return message.reply('🐾 *تطالعك بطرف عينها بصمت مريب...*');

  await message.channel.sendTyping();

  const delay = Math.floor(Math.random() * 1000) + 1500;
  setTimeout(async () => {
    const reply = await getCatwomanReply(message.channel.id, message.author.id, message.author.username, userMessage);
    message.reply(reply);
  }, delay);
});

client.login(process.env.DISCORD_TOKEN);