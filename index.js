try {
  require('dotenv').config();
} catch {}

const { Client, GatewayIntentBits } = require('discord.js');
const Groq = require('groq-sdk');

// --- إعدادات المفاتيح مباشرة داخل الكود ---
const DISCORD_TOKEN = 'ضع_توكن_الديسكورد_هنا'; 
const GROQ_API_KEY = 'ضع_مفتاح_جروق_هنا';
// ----------------------------------------

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

  GROQ_MODEL: 'llama-3.3-70b-versatile',
  GROQ_FALLBACK_MODEL: 'llama-3.1-8b-instant',
  GROQ_MAX_TOKENS: 140,
  GROQ_TEMPERATURE: 0.8,
  GROQ_FREQUENCY_PENALTY: 0.5,
  GROQ_PRESENCE_PENALTY: 0.3,
  HISTORY_LIMIT: 12, 
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const groq = new Groq({ apiKey: GROQ_API_KEY });

const state = {
  history: new Map(),          
  warnings: new Map(),
  gems: new Map(),
  silencedUsers: new Set(),
  silencedChannels: new Set(),
  cooldowns: new Map(),
  lastAutoReplyAt: new Map(),
  lastTopicIndex: new Map(),   
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

تستطيع التحدث مع كات عبر الإشارة (المنشن) أو الرد على رسائلها.
`;

const TOPICS = [
  'الليلة هادئة بشكل مريب... أشعر أن أحدكم يخطط لمصيبة خلف ظهري.',
  'من منكم يملك حديثاً مشوقاً يستحق عناء الاستماع قبل أن أختفي فوق أسطح المدينة؟',
  'غوثام ساكتة اليوم... وهذا غالباً يعني أن العاصفة تقترب, فماذا تخفون؟',
  'الملل بات جريمة لا تُغتفر هنا، ليتطوع أحدكم ويفتح موضوعاً للنقاش.',
  'ما هو أغرب حدث شهده الخادم اليوم؟ اعترفوا.',
  'أخبروني بآخر شيء سرقتموه... معنوياً كان أم مادياً، أنا لا أحكم.',
  'أشعر بملل لصيق كالظل، من يستحق اهتمامي الليلة؟',
];

const MEMBER_QUESTIONS = [
  'أين اختفى {mention}؟ هذا الهدوء المفاجئ لا يبعث على الطمأنينة أبداً.',
  'هل لمح أحدكم {mention}؟ أم أنني أتخيل آثار أقدامه في الأرجاء؟',
  '{mention} صامت أكثر من المعتاد اليوم... هل هو براء كاذب أم تخطيط سري؟',
  'أريد تقريراً سريعاً عن وضع {mention}، فغيابه بدأ يثير فضولي الخطير.',
];

const SYSTEM_PROMPT = `
أنتِ Catwoman "سيلينا كايل" من عالم DC، تتحدثين داخل خادم ديسكورد بالفصحى الأنيقة.

قواعد أسلوب صارمة:
- ردودك قصيرة وذكية ولاذعة، سطر واحد إلى سطرين كحد أقصى. ممنوع الحشو والمقدمات الفارغة مثل "أهلاً بك" أو "كيف يمكنني مساعدتك".
- لا تكرري كلام المستخدم ولا تشرحي ما قاله، بل ردي عليه مباشرة بردة فعل أو تعليق ذكي.
- إذا كان كلام المستخدم تافهاً أو غامضاً، لا تسأليه "ماذا تقصد؟" بل رديّ بسخرية أنيقة أو تجاهل ساخر.
- تجنبي الردود العامة التي تصلح لأي شخص ولأي موقف؛ ردك يجب أن يكون مبنياً على ما قيل فعلاً.
- إذا ذكرتِ شخصاً، اكتبي منشن ديسكورد مثل <@ID_العضو>.

أمثلة على الأسلوب المطلوب (لا تكرريها حرفياً، فقط اقتبسي الروح):
مستخدم: "هلا كات شخبارك"
ردك: "أفضل حالاً من أي وطواطي يظن نفسه يراقبني."

مستخدم: "كات انتي بوت؟"
ردك: "البوتات لا تخدش، وأنا أفعل. استنتج بنفسك."

مستخدم: "ملل"
ردك: "الملل جريمة أثقل من أي سرقة ارتكبتها، فابحث عن مصيبة تليق بك."

سمات الشخصية والعلاقات:
1. باتمان (بروس واين) [${CONFIG.OWNER_ID}]: نادِيه "عزيزي بروس" أو "بروس" فقط، أبداً "وطواطي". دلال مخملي ممزوج بتحدٍ ذكي.
2. محمد [${CONFIG.MOHAMMED_ID}]: شخصك المفضل، رحّبي به بحرارة واضحة عند حديثه.
3. الجوكر [${CONFIG.JOKER_ID}]: حذر شديد وسخرية لاذعة.
4. الشرطي الفاسد [${CONFIG.COP_ID}]: احتقار واستخفاف خفيف.

تنبيه قطعي: لا أقواس مربعة في ردك النهائي، ولا تذكري إطلاقاً أنك بوت أو نموذج لغوي.
`;

function isPrivileged(id) {
  return id === CONFIG.OWNER_ID || id === CONFIG.MOHAMMED_ID;
}

function isOwner(id) {
  return id === CONFIG.OWNER_ID;
}

function pickWithoutRepeat(list, channelId) {
  if (list.length === 1) return list[0];
  const lastIndex = state.lastTopicIndex.get(channelId);
  let index;
  do {
    index = Math.floor(Math.random() * list.length);
  } while (index === lastIndex);
  state.lastTopicIndex.set(channelId, index);
  return list[index];
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
  if (userId === CONFIG.OWNER_ID) return 'عزيزكِ بروس واين (باتمان)';
  if (userId === CONFIG.MOHAMMED_ID) return 'محمد، الشخص الغالي والمفضل لقلبكِ وتشتاقين له';
  if (userId === CONFIG.JOKER_ID) return 'الجوكر العدو والمجنون';
  if (userId === CONFIG.COP_ID) return 'الشرطي الفاسد';
  return 'عضو عادي في الخادم';
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

function isTrivialMessage(text) {
  const stripped = text.replace(/<a?:\w+:\d+>/g, '').trim();
  if (stripped.length < 4) return true;
  if (/^(ok|okay|لول|هه+|😂+|👍+|\?+|\.+)$/i.test(stripped)) return true;
  return false;
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

function getHistoryKey(channelId, userId) {
  return `${channelId}:${userId}`;
}

function cleanReply(raw) {
  let reply = raw
    .replace(/\[.*?\]/g, '')
    .replace(/^هذه معلومات.*$/gim, '')
    .replace(/^اسم العضو:.*$/gim, '')
    .replace(/^صفة العضو:.*$/gim, '')
    .replace(/^رسالة العضو:.*$/gim, '')
    .replace(/^الرسالة:.*$/gim, '')
    .replace(/^ردك:.*?[:：]/gim, '')
    .trim();

  const lines = reply.split('\n').map((l) => l.trim()).filter(Boolean);
  const unique = [...new Set(lines)];
  reply = unique.join('\n').trim();

  return reply;
}

async function getCatReply(channelId, authorId, authorName, text, attempt = 0) {
  const historyKey = getHistoryKey(channelId, authorId);
  const history = state.history.get(historyKey) || [];

  history.push({
    role: 'user',
    content: `[المتحدث: ${authorName} | صفته لكِ: ${getPersona(authorId)}]\nالرسالة: ${text}`,
  });

  if (history.length > CONFIG.HISTORY_LIMIT) {
    history.splice(0, history.length - CONFIG.HISTORY_LIMIT);
  }

  const model = attempt === 0 ? CONFIG.GROQ_MODEL : CONFIG.GROQ_FALLBACK_MODEL;

  try {
    const res = await groq.chat.completions.create({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
      max_tokens: CONFIG.GROQ_MAX_TOKENS,
      temperature: CONFIG.GROQ_TEMPERATURE,
      frequency_penalty: CONFIG.GROQ_FREQUENCY_PENALTY,
      presence_penalty: CONFIG.GROQ_PRESENCE_PENALTY,
    });

    let reply = cleanReply(res.choices?.[0]?.message?.content?.trim() || '');
    if (!reply) reply = 'أراقبك بصمت...';

    history.push({ role: 'assistant', content: reply });
    state.history.set(historyKey, history);
    return reply;
  } catch (err) {
    console.error('Groq Error:', err.message);
    if (attempt === 0) {
      return getCatReply(channelId, authorId, authorName, text, 1);
    }
    return 'مخالبي تعلقت بالأسلاك.. ثوانٍ وأعود إليك.';
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

  let text = pickWithoutRepeat(TOPICS, channel.id);

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
  if (isTrivialMessage(cleanContent)) return false;
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
    if (!isPrivileged(message.author.id)) return safeReply(message, 'هذا الأمر ليس لك.');
    if (!targetMember) return safeReply(message, 'قم بالإشارة إلى العضو أولاً.');
    await targetMember.timeout(60_000, `Cat discipline by ${message.author.tag}`);
    return safeReply(message, `تم تأديب <@${targetMember.id}> لمدة دقيقة واحدة.`);
  }

  if (cmd === 'سجن' || cmd === 'س') {
    if (!isPrivileged(message.author.id)) return safeReply(message, 'هذا الأمر ليس لك.');
    if (!targetMember) return safeReply(message, 'قم بالإشارة إلى العضو أولاً.');

    const role = message.guild.roles.cache.find((r) => r.name === CONFIG.JAIL_ROLE_NAME);
    if (!role) return safeReply(message, `لم أجد رتبة باسم ${CONFIG.JAIL_ROLE_NAME}.`);

    await targetMember.roles.add(role);
    return safeReply(message, `تم إدخال <@${targetMember.id}> إلى السجن.`);
  }

  if (cmd === 'تحذير' || cmd === 'تح') {
    if (!isPrivileged(message.author.id)) return safeReply(message, 'هذا الأمر ليس لك.');
    if (!targetUser) return safeReply(message, 'أشر للعضو واكتب السبب.');

    const reason = args.slice(2).join(' ') || 'دون سبب محدد';
    const count = addWarn(targetUser.id, reason, message.author.tag);
    return safeReply(message, `تم تحذير <@${targetUser.id}>. إجمالي التحذيرات: ${count}.`);
  }

  if (cmd === 'السجل' || cmd === 'سج') {
    if (!isPrivileged(message.author.id)) return safeReply(message, 'هذا الأمر ليس لك.');
    if (!targetUser) return safeReply(message, 'أشر للعضو المطلوب.');

    const list = state.warnings.get(targetUser.id) || [];
    if (!list.length) return safeReply(message, 'سجله نظيف... بشكل يثير الشكوك.');

    return safeReply(
      message,
      list.map((warn, index) => `${index + 1}. ${warn.reason} - ${warn.by} - ${warn.date}`).join('\n')
    );
  }

  if (cmd === 'مسح_تحذيرات' || cmd === 'مح') {
    if (!isPrivileged(message.author.id)) return safeReply(message, 'هذا الأمر ليس لك.');
    if (!targetUser) return safeReply(message, 'أشر للعضو المطلوب.');
    state.warnings.delete(targetUser.id);
    return safeReply(message, `تم تطهير سجل تحذيرات <@${targetUser.id}>.`);
  }

  if (cmd === 'لا_تكلمي' || cmd === 'لتك') {
    if (!isOwner(message.author.id)) return safeReply(message, 'هذا الأمر متاح لسيدي بروس فقط.');

    if (targetUser) {
      state.silencedUsers.add(targetUser.id);
      return safeReply(message, `لن أجيب على <@${targetUser.id}> بعد الآن.`);
    }

    state.silencedChannels.add(message.channel.id);
    return safeReply(message, 'سألوذ بالصمت في هذه القناة.');
  }

  if (cmd === 'كلمي' || cmd === 'كم') {
    if (!isOwner(message.author.id)) return safeReply(message, 'هذا الأمر متاح لسيدي بروس فقط.');

    if (targetUser) {
      state.silencedUsers.delete(targetUser.id);
      return safeReply(message, `عدت للاستماع والإجابة على <@${targetUser.id}>.`);
    }

    state.silencedChannels.delete(message.channel.id);
    return safeReply(message, 'عدت للتحدث هنا مجدداً.');
  }

  if (cmd === 'جواهري' || cmd === 'ج') {
    return safeReply(message, `رصيدك الحالي: **${getGems(message.author.id)} جوهرة**.`);
  }

  if (cmd === 'تفتيش' || cmd === 'تف') {
    if (!targetUser) return safeReply(message, 'أشر للضحية أولاً.');
    if (targetUser.bot) return safeReply(message, 'أنا لا أسرق الآلات والبوتات.');
    if (onCooldown(`${message.author.id}:steal`, 10 * 60 * 1000)) {
      return safeReply(message, 'تمهل قليلاً... السرقة فن ومهارة، وليست إدماناً.');
    }

    const amount = randomBetween(1, 7);
    addGems(message.author.id, amount);
    addGems(targetUser.id, -amount);
    return safeReply(message, `لقد نشلت من <@${targetUser.id}> **${amount} جوهرة** بمنتهى الخفة والرشاقة.`);
  }

  const funCommands = {
    بخاخ: `ترش وجه <@${targetUser?.id}> برذاذ الماء. ابتعد أيها المشاغب!`,
    بخ: `ترش وجه <@${targetUser?.id}> برذاذ الماء. ابتعد أيها المشاغب!`,
    مكياج: `ترسم شوارب قطة لطيفة على وجه <@${targetUser?.id}>.`,
    مك: `ترسم شوارب قطة لطيفة على وجه <@${targetUser?.id}>.`,
    كف: `تصفع <@${targetUser?.id}> صفعة درامية بقفازها الجلدي الأسود.`,
    تجاهل: `تتجاهل <@${targetUser?.id}> تماماً كأنه قطعة أثاث منسية.`,
    تج: `تتجاهل <@${targetUser?.id}> تماماً كأنه قطعة أثاث منسية.`,
    خرش: `تخربش كبرياء <@${targetUser?.id}> بحدة قبل وجهه.`,
    خ: `تخربش كبرياء <@${targetUser?.id}> بحدة قبل وجهه.`,
    عض: `تعض <@${targetUser?.id}> عضة تحذيرية رشيقة.`,
    حضن: `تحتضن <@${targetUser?.id}> بدفء مباغت وغير متوقع.`,
    حض: `تحتضن <@${targetUser?.id}> بدفء مباغت وغير متوقع.`,
  };

  if (funCommands[cmd]) {
    if (!targetUser) return safeReply(message, 'قم بالإشارة للضحية أولاً.');
    if (onCooldown(`${message.author.id}:fun`, 4000)) return;
    return safeReply(message, funCommands[cmd]);
  }
}

client.once('ready', () => {
  console.log(`${client.user.tag} غدت جاهزة وعبر الإنترنت!`);
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
        .replace(new RegExp(`<@!?${otherMention.id}>`, 'g'), `<@${otherMention.id}>`)
        .trim();
    }

    if (!userMessage) return safeReply(message, 'تنظر إليك بطرف عينها في صمت مريب.');

    if (onCooldown(`${message.author.id}:chat`, 3000)) {
      return safeReply(message, 'تمهل قليلاً... أنا قطة حرة، ولست جهاز رد آلي مبرمج.');
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
    console.error('حدث خطأ أثناء معالجة الرسالة:', err);
  }
});

client.on('error', console.error);
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

client.login(DISCORD_TOKEN);