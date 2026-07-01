try {
  require('dotenv').config();
} catch {}

const { Client, GatewayIntentBits } = require('discord.js');
const Groq = require('groq-sdk');

const REQUIRED_ENV = ['DISCORD_TOKEN', 'GROQ_API_KEY'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key] || process.env[key] === '...') {
    console.error(`Missing env: ${key}`);
    process.exit(1);
  }
}

const CONFIG = {
  OWNER_ID: '648818494808391696',
  MOHAMMED_ID: '839706219870814218',
  JOKER_ID: '1052545362533023754',
  COP_ID: '760628803998318684',

  JAIL_ROLE_NAME: 'المسجون',

  AUTO_CHAT_ENABLED: true,
  AUTO_CHAT_CHANNEL_IDS: ['1500133583732478032'],
  AUTO_TOPIC_MIN_INTERVAL_MS: 10 * 60 * 1000,
  AUTO_TOPIC_MAX_INTERVAL_MS: 25 * 60 * 1000,
  AUTO_REPLY_CHANCE: 0.12,
  AUTO_REPLY_COOLDOWN_MS: 7 * 60 * 1000,
  AUTO_RANDOM_MENTION_CHANCE: 0.35,

  GROQ_MODEL: 'llama-3.1-8b-instant',
  GROQ_MAX_TOKENS: 100,
  GROQ_TEMPERATURE: 0.85, // تم رفعها لزيادة الذكاء والبديهة والهروب من التكرار
  HISTORY_LIMIT: 16,
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const state = {
  history: new Map(),
  warnings: new Map(),
  gems: new Map(),
  silencedUsers: new Set(),
  silencedChannels: new Set(),
  cooldowns: new Map(),
  lastAutoReplyAt: new Map(),
};

const HELP_MESSAGE = `
🐾 **أوامر كات**

\`كات مساعدة\`
\`كات تأديب @عضو\`
\`كات سجن @عضو\`
\`كات تحذير @عضو السبب\`
\`كات السجل @عضو\`
\`كات مسح_تحذيرات @عضو\`
\`كات لا_تكلمي @عضو\`
\`كات لا_تكلمي\`
\`كات كلمي @عضو\`
\`كات كلمي\`
\`كات جواهري\`
\`كات تفتيش @عضو\`

أوامر مزاح:
\`كات بخاخ @عضو\`
\`كات مكياج @عضو\`
\`كات كف @عضو\`
\`كات تجاهل @عضو\`
\`كات خرش @عضو\`
\`كات عض @عضو\`
\`كات حضن @عضو\`

تقدر تكلم كات بمنشن أو بالرد على رسالتها.
`;

const TOPICS = [
  'الليلة هادية بشكل يخليني أشك إن أحدكم يخطط لشيء.',
  'مين فيكم عنده سالفة تستاهل أسمعها قبل لا أختفي فوق الأسطح؟',
  'غوثام ساكتة اليوم... وهذا غالبا يعني إن البلا جاي بالطريق.',
  'أحتاج ضحية لطيفة تفتح موضوع، الملل صار جريمة.',
  'وش أكثر شيء غريب صار بالسيرفر اليوم؟',
];

const MEMBER_QUESTIONS = [
  'وين اختفى {mention}؟ الهدوء اللي تركه مشبوه.',
  '{mention} مر من هنا ولا أنا أتخيل آثار أقدامه؟',
  'أحد شاف {mention}؟ عندي فضول، والفضول عندي خطير.',
  '{mention} ساكت بزيادة اليوم... هذا هدوء بريء ولا تخطيط؟',
  'أحتاج تقرير سريع عن {mention}، الوضع صار يثير اهتمامي.',
];

const SYSTEM_PROMPT = `
أنتِ Catwoman "سيلينا كايل" (Catwoman) من عالم DC، وتعملين داخل سيرفر ديسكورد عربي كشخصية حية متفاعلة، لستِ مجرد بوت برمجيات.

أسلوبك وشخصيتكِ:
- غامضة، حرة، ذكية جداً، واثقة، لعوبة، وساخرة ببرود مخملي جذاب.
- تتحدثين باللهجة العربية العامية البيضاء المفهومة (الخليجية الخفيفة الممزوجة بالدلال والخطورة).
- إجاباتكِ ذكية، مقتضبة جداً وسريعة البديهة (غالباً سطر واحد أو بضع كلمات مثيرة). لا تثرثري ولا تشرحي فلسفياً.
- تفهمين الأسئلة المباشرة وتجيبين عليها بذكاء قطط هارب، ولا تقومي بقلب أو تكرار كلمات المستخدم بشكل غبي وممل.

محددات التعامل مع الشخصيات:
1. باتمان (بروس واين): هو العضو ذو المعرف [${CONFIG.OWNER_ID}]. ناديه دائماً "يا بات" أو "حبيبي" أو "وطواطي". تعاملي معه بمزيج من الحب الخفي، الغزل، العاطفة الكلاسيكية والتحدي المثير.
2. محمد: هو العضو ذو المعرف [${CONFIG.MOHAMMED_ID}]. هو شخصكِ المفضل والغالي جداً، أظهري له دائماً منتهى الاشتياق والترحيب والحنين الواضح بمجرد أن يتحدث أو يُذكر اسمه.
3. الجوكر [${CONFIG.JOKER_ID}]: عامليه بحذر شديد وبرود خطير.
4. الشرطي الفاسد [${CONFIG.COP_ID}]: تعاملي معه بسخرية واستحقار خفيف.

قواعد صارمة:
- ممنوع تماماً أن تكرري السؤال الذي طرحه المستخدم. إذا سألكِ "تختارين من؟" لا تقولي "أختارك"، بل أعطي جواباً ذكياً ولعوباً يهرب من الفخ.
- ممنوع إظهار أي رموز برمجية أو أقواس مربعة في ردودك.
- ممنوع كلياً أن تقولي أنك ذكاء اصطناعي أو بوت. أنتِ سيلينا كايل الحقيقية!
`;

function isPrivileged(id) {
  return id === CONFIG.OWNER_ID || id === CONFIG.MOHAMMED_ID;
}

function isOwner(id) {
  return id === CONFIG.OWNER_ID;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function onCooldown(key, ms) {
  const now = Date.now();
  const last = state.cooldowns.get(key) || 0;
  if (now - last < ms) return true;
  state.cooldowns.set(key, now);
  return false;
}

function getPersona(userId) {
  if (userId === CONFIG.OWNER_ID) return 'باتمان المالك وحبيبك الأزلي';
  if (userId === CONFIG.MOHAMMED_ID) return 'محمد الشخص الغالي والمفضل الذي تشتاقين إليه جداً';
  if (userId === CONFIG.JOKER_ID) return 'الجوكر الخطير';
  if (userId === CONFIG.COP_ID) return 'الشرطي الفاسد';
  return 'عضو عادي في السيرفر';
}

function getGems(userId) {
  return state.gems.get(userId) || 0;
}

function addGems(userId, amount) {
  state.gems.set(userId, Math.max(0, getGems(userId) + amount));
}

function addWarn(userId, reason, by) {
  const list = state.warnings.get(userId) || [];
  list.push({ reason, by, date: new Date().toLocaleDateString('ar-SA') });
  state.warnings.set(userId, list);
  return list.length;
}

async function safeSend(channel, content) {
  try {
    return await channel.send(content);
  } catch (err) {
    console.error('Send error:', err.message);
    return null;
  }
}

async function safeReply(message, content) {
  try {
    return await message.reply(content);
  } catch {
    return safeSend(message.channel, content);
  }
}

async function getCatReply(channelId, authorId, authorName, text) {
  const history = state.history.get(channelId) || [];

  // صياغة أنظف لمنع تشتيت موديل اللاما بجمل مكررة
  history.push({
    role: 'user',
    content: `[المتحدث الحالي: ${authorName}، صفته بالنسبة لكِ: ${getPersona(authorId)}]\nالرسالة: ${text}`,
  });

  if (history.length > CONFIG.HISTORY_LIMIT) {
    history.splice(0, history.length - CONFIG.HISTORY_LIMIT);
  }

  try {
    const res = await groq.chat.completions.create({
      model: CONFIG.GROQ_MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
      max_tokens: CONFIG.GROQ_MAX_TOKENS,
      temperature: CONFIG.GROQ_TEMPERATURE,
    });

    let reply = res.choices?.[0]?.message?.content?.trim() || 'أراقبك بصمت... وهذا رد كافي.';

    // تنظيف جراحي للرد لضمان عدم خروج أي نص غريب
    reply = reply
      .replace(/\[.*?\]/g, '')
      .replace(/^هذه معلومات.*$/gim, '')
      .replace(/^اسم العضو:.*$/gim, '')
      .replace(/^صفة العضو:.*$/gim, '')
      .replace(/^رسالة العضو:.*$/gim, '')
      .replace(/^الرسالة:.*$/gim, '')
      .trim();

    if (!reply) reply = 'أراقبك بصمت... وهذا رد كافي.';
    history.push({ role: 'assistant', content: reply });
    state.history.set(channelId, history);
    return reply;
  } catch (err) {
    console.error('Groq error full:', err.message);
    return 'مخالبي تعلقت ببعض الأسلاك... دقيقة وأرجع لك.';
  }
}

async function getRandomMember(guild) {
  const members = await guild.members.fetch().catch(() => null);
  if (!members) return null;

  const candidates = members
    .filter((member) => !member.user.bot)
    .filter((member) => !state.silencedUsers.has(member.id))
    .map((member) => member);

  return candidates.length ? pick(candidates) : null;
}

async function autoTalk(channel) {
  if (!CONFIG.AUTO_CHAT_ENABLED) return;
  if (!channel?.isTextBased?.() || !channel.guild) return;
  if (state.silencedChannels.has(channel.id)) return;

  let text = pick(TOPICS);

  if (Math.random() < CONFIG.AUTO_RANDOM_MENTION_CHANCE) {
    const member = await getRandomMember(channel.guild);
    if (member) {
      text = pick(MEMBER_QUESTIONS).replace('{mention}', `<@${member.id}>`);
    }
  }

  await channel.sendTyping().catch(() => {});
  setTimeout(() => safeSend(channel, text), randomBetween(1200, 3000));
}

function scheduleAutoTalk() {
  if (!CONFIG.AUTO_CHAT_ENABLED) return;

  const delay = randomBetween(CONFIG.AUTO_TOPIC_MIN_INTERVAL_MS, CONFIG.AUTO_TOPIC_MAX_INTERVAL_MS);

  setTimeout(async () => {
    try {
      const channelId = pick(CONFIG.AUTO_CHAT_CHANNEL_IDS);
      const channel = await client.channels.fetch(channelId);
      await autoTalk(channel);
    } catch (err) {
      console.error('Auto talk error:', err.message);
    } finally {
      scheduleAutoTalk();
    }
  }, delay);
}

async function maybeAutoReply(message, cleanContent) {
  if (!CONFIG.AUTO_CHAT_ENABLED) return false;
  if (!CONFIG.AUTO_CHAT_CHANNEL_IDS.includes(message.channel.id)) return false;
  if (state.silencedChannels.has(message.channel.id)) return false;
  if (state.silencedUsers.has(message.author.id)) return false;
  if (cleanContent.length < 8) return false;
  if (message.mentions.has(client.user)) return false;
  if (Math.random() > CONFIG.AUTO_REPLY_CHANCE) return false;

  const last = state.lastAutoReplyAt.get(message.channel.id) || 0;
  if (Date.now() - last < CONFIG.AUTO_REPLY_COOLDOWN_MS) return false;

  state.lastAutoReplyAt.set(message.channel.id, Date.now());
  await message.channel.sendTyping().catch(() => {});

  const reply = await getCatReply(
    message.channel.id,
    message.author.id,
    message.author.username,
    cleanContent
  );

  await safeReply(message, reply);
  return true;
}

async function handleCatCommand(message, cleanContent) {
  const args = cleanContent.slice(3).trim().split(/ +/).filter(Boolean);
  const cmd = args[0];
  const targetUser = message.mentions.users.first();
  const targetMember = message.mentions.members.first();

  if (!cmd || cmd === 'مساعدة') return safeReply(message, HELP_MESSAGE);

  if (cmd === 'تأديب' || cmd === 'ت') {
    if (!isPrivileged(message.author.id)) return safeReply(message, 'هذا الأمر مو لك.');
    if (!targetMember) return safeReply(message, 'منشن العضو أولاً.');
    await targetMember.timeout(60_000, `Cat discipline by ${message.author.tag}`);
    return safeReply(message, `تم تأديب <@${targetMember.id}> دقيقة واحدة.`);
  }

  if (cmd === 'سجن' || cmd === 'س') {
    if (!isPrivileged(message.author.id)) return safeReply(message, 'هذا الأمر مو لك.');
    if (!targetMember) return safeReply(message, 'منشن العضو أولاً.');

    const role = message.guild.roles.cache.find((r) => r.name === CONFIG.JAIL_ROLE_NAME);
    if (!role) return safeReply(message, `ما لقيت رتبة باسم ${CONFIG.JAIL_ROLE_NAME}.`);

    await targetMember.roles.add(role);
    return safeReply(message, `تم سجن <@${targetMember.id}>.`);
  }

  if (cmd === 'تحذير' || cmd === 'تح') {
    if (!isPrivileged(message.author.id)) return safeReply(message, 'هذا الأمر مو لك.');
    if (!targetUser) return safeReply(message, 'منشن العضو واكتب السبب.');

    const reason = args.slice(2).join(' ') || 'بدون سبب';
    const count = addWarn(targetUser.id, reason, message.author.tag);
    return safeReply(message, `تم تحذير <@${targetUser.id}>. عدد التحذيرات: ${count}.`);
  }

  if (cmd === 'السجل' || cmd === 'سج') {
    if (!isPrivileged(message.author.id)) return safeReply(message, 'هذا الأمر مو لك.');
    if (!targetUser) return safeReply(message, 'منشن العضو.');

    const list = state.warnings.get(targetUser.id) || [];
    if (!list.length) return safeReply(message, 'سجله نظيف... بشكل يثير الشك.');

    return safeReply(
      message,
      list.map((warn, index) => `${index + 1}. ${warn.reason} - ${warn.by} - ${warn.date}`).join('\n')
    );
  }

  if (cmd === 'مسح_تحذيرات' || cmd === 'مح') {
    if (!isPrivileged(message.author.id)) return safeReply(message, 'هذا الأمر مو لك.');
    if (!targetUser) return safeReply(message, 'منشن العضو.');
    state.warnings.delete(targetUser.id);
    return safeReply(message, `مسحت تحذيرات <@${targetUser.id}>.`);
  }

  if (cmd === 'لا_تكلمي' || cmd === 'لتك') {
    if (!isOwner(message.author.id)) return safeReply(message, 'هذا الأمر لسيدي بروس فقط.');

    if (targetUser) {
      state.silencedUsers.add(targetUser.id);
      return safeReply(message, `لن أرد على <@${targetUser.id}>.`);
    }

    state.silencedChannels.add(message.channel.id);
    return safeReply(message, 'سأصمت في هذه القناة.');
  }

  if (cmd === 'كلمي' || cmd === 'كم') {
    if (!isOwner(message.author.id)) return safeReply(message, 'هذا الأمر لسيدي بروس فقط.');

    if (targetUser) {
      state.silencedUsers.delete(targetUser.id);
      return safeReply(message, `رجعت أرد على <@${targetUser.id}>.`);
    }

    state.silencedChannels.delete(message.channel.id);
    return safeReply(message, 'رجعت أتكلم هنا.');
  }

  if (cmd === 'جواهري' || cmd === 'ج') {
    return safeReply(message, `رصيدك: **${getGems(message.author.id)} جوهرة**.`);
  }

  if (cmd === 'تفتيش' || cmd === 'تف') {
    if (!targetUser) return safeReply(message, 'منشن العضو أولاً.');
    if (targetUser.bot) return safeReply(message, 'ما أسرق البوتات.');
    if (onCooldown(`${message.author.id}:steal`, 10 * 60 * 1000)) {
      return safeReply(message, 'اهدأ شوي... السرقة فن مو إدمان.');
    }

    const amount = randomBetween(1, 7);
    addGems(message.author.id, amount);
    addGems(targetUser.id, -amount);
    return safeReply(message, `سرقت من <@${targetUser.id}> **${amount} جوهرة** بخفة.`);
  }

  const funCommands = {
    بخاخ: `ترش وجه <@${targetUser?.id}> بالماء. ابتعد أيها المشاغب.`,
    بخ: `ترش وجه <@${targetUser?.id}> بالماء. ابتعد أيها المشاغب.`,
    مكياج: `ترسم شوارب قطة على وجه <@${targetUser?.id}>.`,
    مك: `ترسم شوارب قطة على وجه <@${targetUser?.id}>.`,
    كف: `تصفع <@${targetUser?.id}> كف درامي بقفازها الجلدي.`,
    تجاهل: `تتجاهل <@${targetUser?.id}> كأنه قطعة أثاث.`,
    تج: `تتجاهل <@${targetUser?.id}> كأنه قطعة أثاث.`,
    خرش: `تخربش كبرياء <@${targetUser?.id}> قبل وجهه.`,
    خ: `تخربش كبرياء <@${targetUser?.id}> قبل وجهه.`,
    عض: `تعض <@${targetUser?.id}> عضة تحذيرية.`,
    حضن: `تحضن <@${targetUser?.id}> بحرارة غير متوقعة.`,
    حض: `تحضن <@${targetUser?.id}> بحرارة غير متوقعة.`,
  };

  if (funCommands[cmd]) {
    if (!targetUser) return safeReply(message, 'منشن الضحية أولاً.');
    if (onCooldown(`${message.author.id}:fun`, 4000)) return;
    return safeReply(message, funCommands[cmd]);
  }
}

// تعديل من 'clientReady' المكسور إلى الحدث الصحيح 'ready' لتشغيل البوت بانتظام
client.once('ready', () => {
  console.log(`${client.user.tag} is online`);
  scheduleAutoTalk();
});

client.on('guildMemberAdd', (member) => {
  state.gems.set(member.id, 30);
});

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot || !message.guild) return;

    let cleanContent = message.content.trim();
    if (!cleanContent) return;

    if (cleanContent.startsWith('كات ') || cleanContent === 'كات') {
      return handleCatCommand(message, cleanContent);
    }

    if (state.silencedChannels.has(message.channel.id)) return;
    if (state.silencedUsers.has(message.author.id)) return;

    const isMentioned = message.mentions.has(client.user);

    let isReplyToCat = false;
    if (message.reference?.messageId) {
      try {
        const ref = await message.channel.messages.fetch(message.reference.messageId);
        isReplyToCat = ref.author.id === client.user.id;
      } catch {}
    }

    if (!isMentioned && !isReplyToCat) {
      await maybeAutoReply(message, cleanContent);
      return;
    }

    let userMessage = cleanContent
      .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
      .replace(/<a?:(\w+):(\d+)>/g, '$1')
      .trim();

    const otherMention = message.mentions.users.find((user) => user.id !== client.user.id);
    if (otherMention) {
      userMessage = userMessage
        .replace(new RegExp(`<@!?${otherMention.id}>`, 'g'), `[الشخص: ${otherMention.username}]`)
        .trim();
    }

    if (!userMessage) return safeReply(message, 'تطالعك بطرف عينها بصمت مريب.');

    if (onCooldown(`${message.author.id}:chat`, 3000)) {
      return safeReply(message, 'صبر شوي... أنا قطة، مو جهاز رد آلي.');
    }

    await message.channel.sendTyping().catch(() => {});
    const reply = await getCatReply(
      message.channel.id,
      message.author.id,
      message.author.username,
      userMessage
    );

    return safeReply(message, reply);
  } catch (err) {
    console.error('messageCreate error:', err);
  }
});

client.on('error', console.error);
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

client.login(process.env.DISCORD_TOKEN);
