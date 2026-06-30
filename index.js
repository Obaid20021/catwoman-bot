/**
 * ============================================================
 *  Catwoman Discord Bot — نسخة معاد بناؤها بالكامل
 *  تحسينات رئيسية:
 *   - بنية أوامر منظمة (Map) بدل سلسلة if طويلة
 *   - نظام صلاحيات وكول داون موحّد
 *   - معالجة أخطاء شاملة في كل نقطة اتصال بـ Discord/Groq
 *   - ذاكرة محادثة لكل قناة مع تحديد حجم وتنظيف تلقائي
 *   - لعبة السرقة معاد كتابتها بمنطق أوضح وأكثر أماناً (race conditions)
 *   - تحقق من المتغيرات البيئية عند الإقلاع
 *   - تنظيف دوري للحالات المؤقتة (cooldowns) لمنع تسرب الذاكرة
 * ============================================================
 */

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionsBitField,
} = require('discord.js');
const Groq = require('groq-sdk');

// =====================================================================
// 0) التحقق من متغيرات البيئة قبل أي شيء
// =====================================================================
const REQUIRED_ENV = ['DISCORD_TOKEN', 'GROQ_API_KEY'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ متغير البيئة المطلوب غير موجود: ${key}`);
    process.exit(1);
  }
}

// =====================================================================
// 1) الإعدادات الثابتة
// =====================================================================
const CONFIG = {
  OWNER_ID: '648818494808391696',
  JOKER_ID: '1052545362533023754',
  COP_ID: '760628803998318684',
  MOHAMMED_ID: '839706219870814218',
  JAIL_ROLE_NAME: 'المسجون',
  AUTO_MESSAGE_CHANNEL_ID: '1500133583732478032', // عدّل هذا للقناة الفعلية
  AUTO_MESSAGE_INTERVAL_MS: 8 * 60 * 60 * 1000, // 8 ساعات
  CONVERSATION_HISTORY_LIMIT: 16, // عدد الرسائل المحفوظة لكل قناة (user+assistant)
  GROQ_MODEL: 'llama-3.3-70b-versatile',
  GROQ_MAX_TOKENS: 60,
  GROQ_TEMPERATURE: 0.65,
  COMMAND_COOLDOWN_MS: 3000, // كول داون عام بين الأوامر التفاعلية لكل مستخدم
  GAME_MIN_PLAYERS: 3,
  GAME_JOIN_TIME_MS: 30_000,
  GAME_ROLE_REVEAL_TIME_MS: 60_000,
  GAME_VOTE_TIME_MS: 20_000,
  GAME_GUESS_TIME_MS: 20_000,
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

const CAT_AUTOMATIC_MESSAGES = [
  'القصر باهت وموحش هالأيام.. غياب محمد ترك فراغ ما كنت أتوقعه، أتمنى هالشهرين تمر بسرعة.',
  'وينك يا محمد؟ المكان ماله طعم بدون حسّك وصوتك.. المدينة صايرة مملة وثقيلة.',
  'مر وقت طويل.. أشتاق للمشاغبة وتلطيف الأجواء اللي كان يسويها محمد في السيرفر.',
  'أراقبكم من فوق أسطح غوثام.. الكل يتحرك بملل، حتى الجريمة صايرة باهتة بدون بعض الناس.',
  'يا بات.. أجهزتك عملاقة لكنها ما تقدر تقيس كمية الملل اللي أحس فيها بغياب الغالين.',
  'تجلس على حافة النافذة وتتأمل المطر.. القصر هادي زيادة عن اللزوم، ومحمد مطوّل بغيابه.',
  'العالم يظن إن كاتوومان ما تشتاق.. هه، لو يعرفون بس كم القصر موحش بدون محمد.',
];

const CATWOMAN_SYSTEM_PROMPT = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics في سيرفر ديسكورد.
شخصيتكِ: غامضة، ساحرة، ذكية، ساخرة، تتحدثين بلهجة عامية جذابة وانسيابية وبدون تكلف.

قواعد التعامل حسب صفة المرسل المرفقة بالرسالة:
1. [باتمان]: ناديه "يا بات" أو "حبيبي"، تعاملي معه ببرود ظاهري مع مشاعر عميقة وغزل ساحر. هو حبكِ الأبدي الوحيد ولا ترفضين له طلباً.
2. [محمد]: (هو غائب حالياً لمدة شهرين) إذا سألك أحد عنه أو تحدثتِ عنه، تظهرين بنبرة حزينة جداً، صادقة، وتشتاقين لوجوده وصوته في القصر، وتعبرين عن أن المكان باهت وموحش بدونه وتتمنين عودته سريعاً.
3. [الجوكر]: تعاملي معه باحترام وهدوء ولطف، بلا سخرية أو عداء، حتى لو كانت نبرتكِ فيها غموض كاتوومان المعتاد.
4. [الشرطي الفاسد]: تعاملي معه باحترام وهدوء ولطف، بلا سخرية أو عداء، حتى لو كانت نبرتكِ فيها غموض كاتوومان المعتاد.
5. [عضو عادي]: باردة، متكبرة، ترفضين أي تقرب عاطفي بسخرية قاسية.

قواعد التنسيق الشديدة:
- ردك يجب أن يكون قصيراً جداً: جملة واحدة فقط في الغالب، وجملتان كحد أقصى مطلق لا تتجاوزينه أبداً مهما كان السؤال.
- ممنوع الإطالة أو الشرح أو سرد التفاصيل، اختصري بأسلوب لاذع وذكي بدل الكلام الكثير.
- ممنوع منعاً باتاً كتابة أو وضع أي إيموجيات مخصصة أو رموز نصية مثل :CATWOMAN_smile: أو غيرها في كلامك. اجعلي ردك نصياً خالصاً فقط.
- لا تضعي علامات ترقيم مشوهة في نهاية السطر أبداً.
- لا تكتبي منشنات أو رموز @ بنفسكِ.`;

const HELP_MESSAGE = `
🐾 **دليل أوامر كاتوومان الكامل**

━━━━━━━━━━━━━━━━━━━━━━
🛡️ **أوامر الإدارة** *(لباتمان ومحمد فقط)*
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
\`كات لا_تكلمي @عضو\` / \`كات لتك @عضو\` — تكتيم عضو معين (سيدي بروس فقط)
\`كات لا_تكلمي\` / \`كات لتك\` — الصمت في القناة كلها (سيدي بروس فقط)
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
\`كات عض @عضو\` — عضة مفاجئة
\`كات حضن @عضو\` / \`كات حض @عضو\` — حضن دافئ

━━━━━━━━━━━━━━━━━━━━━━
💬 **التحدث مع كاتوومان**
━━━━━━━━━━━━━━━━━━━━━━
منشن البوت أو رد على رسائله للتحدث معه مباشرة!

\`/مساعدة\` — عرض هذه القائمة (مخفية عنك فقط)
━━━━━━━━━━━━━━━━━━━━━━
🐾 *"المعلومات سلاح، والسلاح بيد كاتوومان دائماً."*
`;

// =====================================================================
// 2) العميل والحالة (كل البيانات بالذاكرة كما هو مطلوب)
// =====================================================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
  ],
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const state = {
  sharedConversations: new Map(), // channelId -> [{role, content}]
  catInventory: new Map(), // userId -> number
  warnData: new Map(), // userId -> [{reason, by, date}]
  silencedUsers: new Set(),
  silencedChannels: new Set(),
  cooldowns: new Map(), // `${userId}:${command}` -> timestamp
  game: createFreshGameState(),
};

function createFreshGameState() {
  return {
    isRoundActive: false,
    players: [],
    roles: {},
    secretLocation: '',
    detectiveId: '',
  };
}

// تنظيف دوري لجدول الكول داون حتى لا يتضخم بلا داعٍ
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of state.cooldowns) {
    if (now - ts > 60_000) state.cooldowns.delete(key);
  }
}, 5 * 60_000);

// =====================================================================
// 3) دوال مساعدة عامة
// =====================================================================
function isPrivileged(userId) {
  return userId === CONFIG.OWNER_ID || userId === CONFIG.MOHAMMED_ID;
}

function isOwner(userId) {
  return userId === CONFIG.OWNER_ID;
}

function getGems(userId) {
  return state.catInventory.get(userId) || 0;
}

function addGems(userId, amount) {
  state.catInventory.set(userId, getGems(userId) + amount);
}

function addWarn(userId, reason, by) {
  const list = state.warnData.get(userId) || [];
  list.push({ reason, by, date: new Date().toLocaleDateString('ar-SA') });
  state.warnData.set(userId, list);
  return list.length;
}

/** كول داون بسيط لكل (مستخدم + أمر) لمنع السبام */
function isOnCooldown(userId, command) {
  const key = `${userId}:${command}`;
  const last = state.cooldowns.get(key);
  if (last && Date.now() - last < CONFIG.COMMAND_COOLDOWN_MS) return true;
  state.cooldowns.set(key, Date.now());
  return false;
}

function getJailRole(guild) {
  return guild.roles.cache.find((r) => r.name === CONFIG.JAIL_ROLE_NAME) || null;
}

/** يتحقق هل بإمكان البوت فعلياً التأثير على هذا العضو (رتبة، مالك، إلخ) */
function canModerate(guild, targetMember) {
  if (!targetMember) return false;
  if (targetMember.id === guild.ownerId) return false;
  const botMember = guild.members.me;
  if (!botMember) return false;
  return botMember.roles.highest.position > targetMember.roles.highest.position;
}

async function safeReply(message, content) {
  try {
    return await message.reply(content);
  } catch (err) {
    console.error('⚠️ فشل الرد على رسالة:', err.message);
  }
}

async function safeSend(channel, content) {
  try {
    return await channel.send(content);
  } catch (err) {
    console.error('⚠️ فشل إرسال رسالة:', err.message);
  }
}

// =====================================================================
// 4) منطق الذكاء الاصطناعي (Groq)
// =====================================================================
function buildRoleTag(authorId) {
  const roleMap = {
    [CONFIG.OWNER_ID]: 'باتمان',
    [CONFIG.JOKER_ID]: 'الجوكر',
    [CONFIG.COP_ID]: 'الشرطي الفاسد',
    [CONFIG.MOHAMMED_ID]: 'محمد',
  };
  return roleMap[authorId] || 'عضو عادي';
}

function sanitizeReply(raw) {
  return raw
    .replace(/CATWOMAN_smile/gi, '')
    .replace(/batman_laugh/gi, '')
    .replace(/joker/gi, '')
    .replace(/:\w+:/g, '')
    .replace(/\[إيموجي:\s*[^\]]*\]/gi, '')
    .replace(/\[الشخص:?\s*[^\]]*\]/g, '')
    .replace(/<@!?\d+>/g, '')
    .replace(/@\w+/g, '')
    .replace(/^[.\s,،。/_:|-]+/, '')
    .replace(/[.\s,،。/_:|-]+$/, '')
    .trim();
}

async function getCatwomanReply(channelId, authorId, authorName, userMessage) {
  if (!state.sharedConversations.has(channelId)) {
    state.sharedConversations.set(channelId, []);
  }
  const history = state.sharedConversations.get(channelId);

  const userRole = buildRoleTag(authorId);
  const formattedMessage = `[المرسل: ${authorName}، الصفة: ${userRole}]: ${userMessage}`;

  history.push({ role: 'user', content: formattedMessage });
  if (history.length > CONFIG.CONVERSATION_HISTORY_LIMIT) {
    history.splice(0, history.length - CONFIG.CONVERSATION_HISTORY_LIMIT);
  }

  try {
    const completion = await groq.chat.completions.create({
      model: CONFIG.GROQ_MODEL,
      messages: [{ role: 'system', content: CATWOMAN_SYSTEM_PROMPT }, ...history],
      max_tokens: CONFIG.GROQ_MAX_TOKENS,
      temperature: CONFIG.GROQ_TEMPERATURE,
    });

    const rawReply = completion.choices?.[0]?.message?.content?.trim();
    if (!rawReply) throw new Error('رد فارغ من Groq');

    const reply = sanitizeReply(rawReply);
    history.push({ role: 'assistant', content: reply || rawReply });

    return reply || 'تطالعك بصمت غامض...';
  } catch (err) {
    console.error('🚨 خطأ في Groq:', err.message);
    // لا تترك الرسالة المعطوبة بالتاريخ
    history.pop();
    return 'أوه يا بات... هناك تشويش غريب في أجهزة الاتصال حالياً، حاول بعد قليل.';
  }
}

// =====================================================================
// 5) تسجيل Slash Commands
// =====================================================================
async function registerSlashCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('مساعدة')
      .setDescription('عرض قائمة أوامر كاتوومان الكاملة')
      .toJSON(),
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('⏳ جاري تسجيل Slash Commands...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ تم تسجيل Slash Commands بنجاح!');
  } catch (err) {
    console.error('❌ فشل تسجيل Slash Commands:', err.message);
  }
}

// =====================================================================
// 6) معالجات أوامر "كات" — كل أمر دالة مستقلة لسهولة القراءة والصيانة
// =====================================================================

const adminCommands = {
  async تأديب(ctx) {
    return adminCommands.ت(ctx);
  },
  async ت({ message, targetMember, targetUser }) {
    if (!isPrivileged(message.author.id)) return safeReply(message, '🐾 اذهب بعيداً.');
    if (!targetMember) return safeReply(message, '🐾 منشن الضحية.');
    if (!canModerate(message.guild, targetMember)) {
      return safeReply(message, '🚨 لا أملك صلاحية كافية على هذا العضو.');
    }
    try {
      await targetMember.timeout(60_000, 'تأديب عبر كاتوومان');
      return safeSend(message.channel, `🥊 *تُخرسه بسوطها لمدة دقيقة!* <@${targetUser.id}>`);
    } catch (err) {
      console.error('خطأ تأديب:', err.message);
      return safeReply(message, '🚨 لا أملك صلاحية التايم أوت.');
    }
  },
  async سجن(ctx) {
    return adminCommands.س(ctx);
  },
  async س({ message, targetMember, targetUser }) {
    if (!isPrivileged(message.author.id)) return safeReply(message, '🐾 لا تملك صلاحية.');
    if (!targetMember) return safeReply(message, '🐾 منشن الضحية.');
    const jailRole = getJailRole(message.guild);
    if (!jailRole) return safeReply(message, `🚨 لم أجد رتبة باسم **"${CONFIG.JAIL_ROLE_NAME}"**!`);
    if (!canModerate(message.guild, targetMember)) {
      return safeReply(message, '🚨 لا أملك صلاحية كافية على هذا العضو.');
    }
    try {
      await targetMember.roles.add(jailRole);
      return safeSend(message.channel, `⛓️ *تزج <@${targetUser.id}> في السجن!*`);
    } catch (err) {
      console.error('خطأ سجن:', err.message);
      return safeReply(message, '🚨 فشلت العملية.');
    }
  },
  async الاسم_العشوائي(ctx) {
    return adminCommands.ع(ctx);
  },
  async ع({ message, targetMember, targetUser }) {
    if (!isPrivileged(message.author.id)) return safeReply(message, '🐾 لست مؤهلاً لهذا الأمر.');
    if (!targetMember) return safeReply(message, '🐾 منشن العضو أولاً.');
    if (targetUser.id === CONFIG.OWNER_ID) return safeReply(message, '🐾 اسم سيدي بروس فوق كل الشبهات.');
    if (!canModerate(message.guild, targetMember)) {
      return safeReply(message, '🚨 لا أملك صلاحية كافية على هذا العضو.');
    }
    const name = RANDOM_FUNNY_NAMES[Math.floor(Math.random() * RANDOM_FUNNY_NAMES.length)];
    try {
      await targetMember.setNickname(name);
      return safeSend(
        message.channel,
        `🎲 *تغيّرت هوية <@${targetUser.id}> عشوائياً!*\n🐾 "الاسم الجديد: **[ ${name} ]**"`
      );
    } catch (err) {
      console.error('خطأ تغيير الاسم:', err.message);
      return safeReply(message, '🚨 رتبة البوت أقل من رتبة العضو.');
    }
  },
  async ترجيع(ctx) {
    return adminCommands.تر(ctx);
  },
  async تر({ message, targetMember, targetUser }) {
    if (!isPrivileged(message.author.id)) return safeReply(message, '🐾 الصلاحية لأصحاب القصر فقط.');
    if (!targetMember) return safeReply(message, '🐾 منشن الشخص لمسح اسمه المستعار.');
    if (!canModerate(message.guild, targetMember)) {
      return safeReply(message, '🚨 لا أملك صلاحية كافية على هذا العضو.');
    }
    try {
      await targetMember.setNickname(null);
      return safeSend(message.channel, `✨ *أعادت لـ <@${targetUser.id}> اسمه الأصلي!*\n🐾 "تم تنظيف ملفه بطلب من سيدي بروس."`);
    } catch (err) {
      console.error('خطأ إعادة الاسم:', err.message);
      return safeReply(message, '🚨 تعذر إعادة الاسم.');
    }
  },
  async إغلاق(ctx) {
    return adminCommands.اغ(ctx);
  },
  async اغ({ message }) {
    if (!isPrivileged(message.author.id)) return safeReply(message, '🐾 للمدراء فقط!');
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
      return safeSend(message.channel, '🔒 *تم تجميد القناة بالكامل!*');
    } catch (err) {
      console.error('خطأ إغلاق:', err.message);
      return safeReply(message, '🚨 لا أملك صلاحية الإغلاق.');
    }
  },
  async فتح(ctx) {
    return adminCommands.ف(ctx);
  },
  async ف({ message }) {
    if (!isPrivileged(message.author.id)) return safeReply(message, '🐾 للمدراء فقط!');
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
      return safeSend(message.channel, '🔓 *تم فتح القناة!*');
    } catch (err) {
      console.error('خطأ فتح:', err.message);
      return safeReply(message, '🚨 لا أملك صلاحية الفتح.');
    }
  },
  async تحذير(ctx) {
    return adminCommands.تح(ctx);
  },
  async تح({ message, targetUser, targetMember, args }) {
    if (!isPrivileged(message.author.id)) return safeReply(message, '🐾 لا تملك صلاحية التحذير.');
    if (!targetUser) return safeReply(message, '🐾 منشن العضو.');
    const reason = args.slice(2).join(' ') || 'لم يُذكر سبب';
    const count = addWarn(targetUser.id, reason, message.author.username);
    await safeSend(
      message.channel,
      `⚠️ تم تحذير <@${targetUser.id}>.\n📋 **السبب:** ${reason}\n🔢 **عدد تحذيراته:** ${count}`
    );
    if (count >= 3 && targetMember && canModerate(message.guild, targetMember)) {
      try {
        await targetMember.timeout(60 * 60_000, 'وصل لـ 3 تحذيرات');
        await safeSend(message.channel, '🔇 *تُكتّمه تلقائياً لساعة كاملة بسبب وصوله لـ 3 تحذيرات!*');
      } catch (err) {
        console.error('خطأ تكتيم تلقائي:', err.message);
        await safeSend(message.channel, '🚨 لم أتمكن من التكتيم التلقائي.');
      }
    }
  },
  async السجل(ctx) {
    return adminCommands.سج(ctx);
  },
  async سج({ message, targetUser }) {
    if (!targetUser) return safeReply(message, '🐾 منشن العضو.');
    const list = state.warnData.get(targetUser.id);
    if (!list || list.length === 0) return safeReply(message, `✅ <@${targetUser.id}> ليس لديه أي تحذيرات.`);
    const text = list.map((w, i) => `**${i + 1}.** ${w.reason} — بواسطة ${w.by} (${w.date})`).join('\n');
    return safeReply(message, `📋 **تحذيرات ${targetUser.username}:**\n${text}`);
  },
  async مسح_تحذيرات(ctx) {
    return adminCommands.مح(ctx);
  },
  async مح({ message, targetUser }) {
    if (!isPrivileged(message.author.id)) return safeReply(message, '🐾 للمدراء فقط.');
    if (!targetUser) return safeReply(message, '🐾 منشن العضو.');
    state.warnData.delete(targetUser.id);
    return safeReply(message, `🗑️ تم مسح جميع تحذيرات **${targetUser.username}**.`);
  },
  async لا_تكلمي(ctx) {
    return adminCommands.لتك(ctx);
  },
  async لتك({ message, targetUser }) {
    if (!isOwner(message.author.id)) return safeReply(message, '🐾 هذا الأمر لسيدي بروس فقط.');
    if (targetUser) {
      state.silencedUsers.add(targetUser.id);
      return safeSend(message.channel, `🤐 *تدير ظهرها تماماً لـ <@${targetUser.id}> ولن تكلّمه بعد الآن.*`);
    }
    state.silencedChannels.add(message.channel.id);
    return safeSend(message.channel, '🔇 *تصمت كاتوومان في هذه القناة حتى إشعار آخر من سيدها.*');
  },
  async كلمي(ctx) {
    return adminCommands.كم(ctx);
  },
  async كم({ message, targetUser }) {
    if (!isOwner(message.author.id)) return safeReply(message, '🐾 هذا الأمر لسيدي بروس فقط.');
    if (targetUser) {
      state.silencedUsers.delete(targetUser.id);
      return safeSend(message.channel, `🐾 *تعود لتراقب <@${targetUser.id}> من بعيد... ربما.*`);
    }
    state.silencedChannels.delete(message.channel.id);
    return safeSend(message.channel, '🔓 *تعود صوت كاتوومان لهذه القناة بإذن من سيدها.*');
  },
};

const gameplayCommands = {
  async مطلوب(ctx) {
    return gameplayCommands.مط(ctx);
  },
  async مط({ message, targetUser, args }) {
    if (!targetUser) return safeReply(message, '🐾 منشن الملاحق.');
    const bounty = args.slice(2).join(' ') || '10,000,000 $';
    return safeSend(message.channel, `📢 **WANTED / مطلوب**\nالمجرم: <@${targetUser.id}>\nالمكافأة: **${bounty}**`);
  },
  async تفتيش(ctx) {
    return gameplayCommands.تف(ctx);
  },
  async تف({ message, targetUser }) {
    if (!targetUser) return safeReply(message, '🐾 منشن الضحية.');
    if (targetUser.id === message.author.id) return safeReply(message, '🐾 لا يمكنك سرقة نفسك يا عبقري.');
    if (isOnCooldown(message.author.id, 'تفتيش')) {
      return safeReply(message, '⏳ مهلة... دعي الأمور تهدأ قليلاً قبل سرقة أخرى.');
    }
    const gems = getGems(targetUser.id);
    if (gems <= 0) return safeReply(message, '🐾 هذا المسكين مفلس تماماً!');
    const stolen = Math.floor(Math.random() * Math.min(gems, 15)) + 1;
    state.catInventory.set(targetUser.id, gems - stolen);
    addGems(message.author.id, stolen);
    return safeSend(message.channel, `🕵️‍♀️ *تسرق من جيبه بخفة!*\n🐾 "سرقت منه **${stolen} 💎 جوهرة** وحوّلتها لنا!"`);
  },
  async جواهري(ctx) {
    return gameplayCommands.ج(ctx);
  },
  async ج({ message }) {
    return safeReply(message, `💎 رصيدك الحالي: **${getGems(message.author.id)} جوهرة**`);
  },
};

const FUN_COMMANDS = {
  بخاخ: (t) => `💦 *ترش وجه <@${t}> بالماء!*\n🐾 "ابتعد من هنا أيها المشاغب!"`,
  بخ: (t) => `💦 *ترش وجه <@${t}> بالماء!*\n🐾 "ابتعد من هنا أيها المشاغب!"`,
  مكياج: (t) => `💄 *ترسم شوارب قطة وردية على وجه <@${t}>!* 😹`,
  مك: (t) => `💄 *ترسم شوارب قطة وردية على وجه <@${t}>!* 😹`,
  كف: (t) => `👋 *تصفع <@${t}> كافاً درامياً بقفازها الجلدي!* 😼`,
  ك: (t) => `👋 *تصفع <@${t}> كافاً درامياً بقفازها الجلدي!* 😼`,
  تجاهل: (t) => `🙄 *تتثاءب بملل وتدير ظهرها لـ <@${t}> متجاهلةً وجوده كلياً.*`,
  تج: (t) => `🙄 *تتثاءب بملل وتدير ظهرها لـ <@${t}> متجاهلةً وجوده كلياً.*`,
  خرش: (t) => `🐈‍⬛ *تخرش وجه <@${t}> بمخالبها الحادة!*`,
  خ: (t) => `🐈‍⬛ *تخرش وجه <@${t}> بمخالبها الحادة!*`,
  عض: (t) => `🐱 *تنقض فجأة وتعض كتف <@${t}> بقوة!*`,
  حضن: (t) => `🤗 *تحضن <@${t}> بحرارة غير متوقعة منها!* 🐾`,
  حض: (t) => `🤗 *تحضن <@${t}> بحرارة غير متوقعة منها!* 🐾`,
};

const ALL_COMMANDS = { ...adminCommands, ...gameplayCommands };

// =====================================================================
// 7) موجّه أوامر "كات"
// =====================================================================
async function handleCatCommand(message, cleanContent) {
  const args = cleanContent.slice(4).trim().split(/ +/);
  const command = args[0];
  const targetUser = message.mentions.users.first();
  const targetMember = message.mentions.members.first();

  const ctx = { message, args, command, targetUser, targetMember };

  if (ALL_COMMANDS[command]) {
    try {
      return await ALL_COMMANDS[command](ctx);
    } catch (err) {
      console.error(`🚨 خطأ في تنفيذ أمر "${command}":`, err);
      return safeReply(message, '🚨 حدث خطأ غير متوقع أثناء تنفيذ الأمر.');
    }
  }

  if (FUN_COMMANDS[command]) {
    if (!targetUser) return safeReply(message, '🐾 منشن الضحية أولاً.');
    if (isOnCooldown(message.author.id, 'fun')) return; // صامت لتفادي السبام
    return safeSend(message.channel, FUN_COMMANDS[command](targetUser.id));
  }
}

// =====================================================================
// 8) لعبة السرقة الجماعية
// =====================================================================
async function startHeistGame(message) {
  if (state.game.isRoundActive) return safeReply(message, '🐾 هناك لعبة قائمة بالفعل!');

  state.game = createFreshGameState();
  state.game.isRoundActive = true;
  state.game.players = [message.author.id];

  const joinRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('join_game').setLabel('دخول القاعة 🕵️‍♂️').setStyle(ButtonStyle.Primary)
  );

  const lobbyMsg = await safeSend(message.channel, {
    content: `🐾 **اجتماع طوارئ في غوثام!**\n👥 الحضور: <@${message.author.id}>\n\n⏳ الانضمام مفتوح لـ 30 ثانية...`,
    components: [joinRow],
  });
  if (!lobbyMsg) {
    state.game.isRoundActive = false;
    return;
  }

  const joinCollector = lobbyMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: CONFIG.GAME_JOIN_TIME_MS,
  });

  joinCollector.on('collect', async (i) => {
    try {
      if (state.game.players.includes(i.user.id)) {
        return i.reply({ content: '✅ أنت داخل بالفعل!', ephemeral: true });
      }
      state.game.players.push(i.user.id);
      await i.reply({ content: '✅ انضممت للعبة!', ephemeral: true });
      await lobbyMsg.edit({
        content: `🐾 **اجتماع طوارئ في غوثام!**\n👥 الحضور: ${state.game.players.map((p) => `<@${p}>`).join(', ')}\n\n⏳ الانضمام مفتوح...`,
      });
    } catch (err) {
      console.error('خطأ انضمام لعبة:', err.message);
    }
  });

  joinCollector.on('end', () => handleHeistLobbyEnd(message, lobbyMsg));
}

async function handleHeistLobbyEnd(message, lobbyMsg) {
  try {
    await lobbyMsg.edit({ components: [] });
  } catch {}

  if (state.game.players.length < CONFIG.GAME_MIN_PLAYERS) {
    state.game.isRoundActive = false;
    return safeSend(message.channel, `🚨 ألغيت اللعبة لقلة الحضور (يلزم ${CONFIG.GAME_MIN_PLAYERS} على الأقل).`);
  }

  state.game.secretLocation = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  state.game.detectiveId = state.game.players[Math.floor(Math.random() * state.game.players.length)];
  state.game.players.forEach((id) => {
    state.game.roles[id] = id === state.game.detectiveId ? 'detective' : 'gang';
  });

  const roleRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('reveal_role').setLabel('كشف دورك السري 🔍').setStyle(ButtonStyle.Danger)
  );

  const gameMsg = await safeSend(message.channel, {
    content: '🔒 **توزّعت الأدوار سراً!**\n💬 النقاش متاح لمدة دقيقة — جد المحقق واكشفه!',
    components: [roleRow],
  });
  if (!gameMsg) {
    state.game.isRoundActive = false;
    return;
  }

  const roleCollector = gameMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: CONFIG.GAME_ROLE_REVEAL_TIME_MS,
  });

  roleCollector.on('collect', async (b) => {
    try {
      if (!state.game.players.includes(b.user.id)) {
        return b.reply({ content: 'لست في اللعبة!', ephemeral: true });
      }
      const isDetective = state.game.roles[b.user.id] === 'detective';
      await b.reply({
        content: isDetective
          ? '🕵️‍♂️ **أنت المحقق!** حاول معرفة المكان السري عبر الأسئلة!'
          : `🥷 **أنت من العصابة!** المكان السري: **「 ${state.game.secretLocation} 」**`,
        ephemeral: true,
      });
    } catch (err) {
      console.error('خطأ كشف الدور:', err.message);
    }
  });

  roleCollector.on('end', () => handleHeistVotePhase(message, gameMsg));
}

async function handleHeistVotePhase(message, gameMsg) {
  try {
    await gameMsg.edit({ components: [] });
  } catch {}

  const voteRow = new ActionRowBuilder();
  state.game.players.slice(0, 5).forEach((pId, idx) => {
    const name = message.guild.members.cache.get(pId)?.user.username || `لاعب ${idx + 1}`;
    voteRow.addComponents(
      new ButtonBuilder().setCustomId(`vote_${pId}`).setLabel(`ضد: ${name}`).setStyle(ButtonStyle.Secondary)
    );
  });

  const voteCounts = Object.fromEntries(state.game.players.map((id) => [id, 0]));
  const hasVoted = new Set();

  const voteMsg = await safeSend(message.channel, {
    content: '🗳️ **حان وقت التصويت!** من هو المحقق؟',
    components: [voteRow],
  });
  if (!voteMsg) {
    state.game.isRoundActive = false;
    return;
  }

  const voteCollector = voteMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: CONFIG.GAME_VOTE_TIME_MS,
  });

  voteCollector.on('collect', async (v) => {
    try {
      if (!state.game.players.includes(v.user.id) || hasVoted.has(v.user.id)) {
        return v.reply({ content: '⛔ لا يمكنك التصويت أكثر من مرة!', ephemeral: true });
      }
      voteCounts[v.customId.replace('vote_', '')]++;
      hasVoted.add(v.user.id);
      await v.reply({ content: '✅ تم تسجيل صوتك!', ephemeral: true });
    } catch (err) {
      console.error('خطأ تصويت:', err.message);
    }
  });

  voteCollector.on('end', () => handleHeistVoteResult(message, voteMsg, voteCounts));
}

async function handleHeistVoteResult(message, voteMsg, voteCounts) {
  try {
    await voteMsg.edit({ components: [] });
  } catch {}

  const highest = state.game.players.reduce(
    (a, b) => (voteCounts[b] > voteCounts[a] ? b : a),
    state.game.players[0]
  );

  if (highest !== state.game.detectiveId) {
    await safeSend(
      message.channel,
      `🃏 **غلطتم!** فاز المحقق <@${state.game.detectiveId}> وتسلل بنجاح!\nالمكان كان **「 ${state.game.secretLocation} 」**.`
    );
    state.game.isRoundActive = false;
    return;
  }

  const options = [
    state.game.secretLocation,
    ...LOCATIONS.filter((l) => l !== state.game.secretLocation).slice(0, 2),
  ].sort(() => Math.random() - 0.5);

  const guessRow = new ActionRowBuilder();
  options.forEach((loc, idx) => {
    guessRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`guess_${idx}_${loc === state.game.secretLocation}`)
        .setLabel(loc)
        .setStyle(ButtonStyle.Success)
    );
  });

  const guessMsg = await safeSend(message.channel, {
    content: `🚨 كشفتم المحقق <@${state.game.detectiveId}>!\n🎯 فرصة أخيرة له لتخمين المكان الصحيح...`,
    components: [guessRow],
  });
  if (!guessMsg) {
    state.game.isRoundActive = false;
    return;
  }

  let correct = false;
  const detectiveId = state.game.detectiveId;
  const secretLocation = state.game.secretLocation;

  const guessColl = guessMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: CONFIG.GAME_GUESS_TIME_MS,
  });

  guessColl.on('collect', async (gInt) => {
    try {
      if (gInt.user.id !== detectiveId) {
        return gInt.reply({ content: 'هذا القرار للمحقق فقط!', ephemeral: true });
      }
      correct = gInt.customId.endsWith('true');
      await gInt.reply({ content: correct ? '🎯 إجابة صحيحة!' : '❌ إجابة خاطئة!', ephemeral: true });
      guessColl.stop();
    } catch (err) {
      console.error('خطأ تخمين:', err.message);
    }
  });

  guessColl.on('end', async () => {
    try {
      await guessMsg.edit({ components: [] });
    } catch {}
    if (correct) {
      await safeSend(
        message.channel,
        `👑 **انقلبت الطاولة!** فاز المحقق <@${detectiveId}> وعرف المكان **「 ${secretLocation} 」**!`
      );
    } else {
      await safeSend(
        message.channel,
        `🎉 **فازت العصابة!** فشل المحقق في التخمين والمكان كان **「 ${secretLocation} 」**.`
      );
    }
    state.game.isRoundActive = false;
  });
}

// =====================================================================
// 9) الأحداث
// =====================================================================
client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} — Catwoman Online! 🐾`);
  await registerSlashCommands();

  setInterval(async () => {
    try {
      const channel = await client.channels.fetch(CONFIG.AUTO_MESSAGE_CHANNEL_ID);
      if (channel && channel.isTextBased()) {
        const randomMessage = CAT_AUTOMATIC_MESSAGES[Math.floor(Math.random() * CAT_AUTOMATIC_MESSAGES.length)];
        await channel.sendTyping();
        setTimeout(() => safeSend(channel, randomMessage), 2000);
      }
    } catch (err) {
      console.error('🚨 فشل إرسال الرسالة التلقائية لكاتوومان:', err.message);
    }
  }, CONFIG.AUTO_MESSAGE_INTERVAL_MS);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'مساعدة') {
    try {
      await interaction.reply({ content: HELP_MESSAGE, ephemeral: true });
    } catch (err) {
      console.error('خطأ أمر المساعدة:', err.message);
    }
  }
});

client.on('guildMemberAdd', (member) => {
  state.catInventory.set(member.id, 30);
});

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot || !message.guild) return;

    let cleanContent = message.content.trim();

    // ---- قسم 1: أوامر "كات" ----
    if (cleanContent.startsWith('كات ') || cleanContent === 'كات') {
      return handleCatCommand(message, cleanContent);
    }

    // ---- قسم 2: لعبة السرقة ----
    if (cleanContent === 'سرقة') {
      return startHeistGame(message);
    }

    // ---- قسم 3: محادثة كاتوومان الذكية ----
    if (state.silencedChannels.has(message.channel.id)) return;
    if (state.silencedUsers.has(message.author.id)) return;

    let mediaDescription = '';
    const urlMatch = cleanContent.match(/(https?:\/\/\S+)/i);
    if (urlMatch) {
      const words = urlMatch[1]
        .split(/[\/\-_.]/)
        .filter((w) => w.length > 3 && !['https', 'http', 'www', 'com', 'media', 'tenor', 'giphy'].includes(w.toLowerCase()));
      if (words.length > 0) mediaDescription += ` [أرسل رابط ميديا يتعلق بـ: ${words.slice(0, 2).join(' ')}]`;
    }
    if (message.attachments.size > 0) {
      const att = message.attachments.first();
      if (att.contentType?.startsWith('image/')) mediaDescription += ` [أرسل صورة باسم: ${att.name}]`;
    }

    cleanContent = cleanContent.replace(/<a?:(\w+):(\d+)>/g, '$1');

    let userMessage = (cleanContent + mediaDescription).trim().replace(`<@${client.user.id}>`, '').trim();
    const otherMention = message.mentions.users.find((u) => u.id !== client.user.id);
    if (otherMention) {
      userMessage = userMessage
        .replace(new RegExp(`<@!?${otherMention.id}>`, 'g'), `[الشخص: ${otherMention.username}]`)
        .trim();
    }

    const isMentioned = message.mentions.has(client.user);
    let isReplyToCatwoman = false;
    if (message.reference?.messageId) {
      try {
        const refMsg = await message.channel.messages.fetch(message.reference.messageId);
        if (refMsg.author.id === client.user.id) isReplyToCatwoman = true;
      } catch {
        // الرسالة الأصلية قد تكون محذوفة، تجاهل بصمت
      }
    }

    if (!isMentioned && !isReplyToCatwoman) return;
    if (!userMessage) return safeReply(message, '🐾 *تطالعك بطرف عينها بصمت مريب...*');

    if (isOnCooldown(message.author.id, 'chat')) {
      return safeReply(message, '🐾 صبر شوي... أنا قطة مش روبوت يرد على طول.');
    }

    await message.channel.sendTyping().catch(() => {});

    const delay = Math.floor(Math.random() * 1000) + 1500;
    setTimeout(async () => {
      const reply = await getCatwomanReply(message.channel.id, message.author.id, message.author.username, userMessage);
      safeReply(message, reply);
    }, delay);
  } catch (err) {
    console.error('🚨 خطأ غير متوقع في messageCreate:', err);
  }
});

// =====================================================================
// 10) معالجة الأخطاء العامة وإغلاق نظيف
// =====================================================================
client.on('error', (err) => console.error('🚨 خطأ في عميل Discord:', err));
process.on('unhandledRejection', (err) => console.error('🚨 Unhandled Rejection:', err));
process.on('uncaughtException', (err) => console.error('🚨 Uncaught Exception:', err));

process.on('SIGINT', () => {
  console.log('👋 إيقاف البوت...');
  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);