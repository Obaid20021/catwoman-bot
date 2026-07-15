try { require('dotenv').config(); } catch {}

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const Groq = require('groq-sdk');
const fs   = require('fs');

// ═══════════════════════════════════════════════════════════
//   إعدادات — كل المفاتيح من متغيرات البيئة فقط
// ═══════════════════════════════════════════════════════════
const DISCORD_TOKEN = "MTUwMDE4NzAxODk4MDg4NDUyMA.G1ErUc.hD4SbqBrk0GY5YpsIBX1V_wFYT2kXwTUFhpNDw";
const GROQ_API_KEY  = "MTUwMDE4NzAxODk4MDg4NDUyMA.G1ErUc.hD4SbqBrk0GY5YpsIBX1V_wFYT2kXwTUFhpNDw";

if (!DISCORD_TOKEN || !GROQ_API_KEY) {
  console.error('❌ خطأ: تأكد من ضبط DISCORD_TOKEN و GROQ_API_KEY في متغيرات البيئة.');
  process.exit(1);
}

const CONFIG = {
  OWNER_ID:     process.env.OWNER_ID     || '648818494808391696',
  MOHAMMED_ID:  process.env.MOHAMMED_ID  || '839706219870814218',
  JOKER_ID:     process.env.JOKER_ID     || '1052545362533023754',
  COP_ID:       process.env.COP_ID       || '760628803998318684',
  DAHOOM_ID:    process.env.DAHOOM_ID    || '1384582859058053161',

  JAIL_ROLE_NAME:   'المسجون',
  LOG_CHANNEL_ID:   1500133583732478032 || null,

  AUTO_CHAT_ENABLED: true,
  AUTO_CHAT_CHANNEL_IDS: (process.env.AUTO_CHAT_CHANNEL_IDS || '1500133583732478032').split(','),
  AUTO_TOPIC_MIN_INTERVAL_MS: 10 * 60 * 1000,
  AUTO_TOPIC_MAX_INTERVAL_MS: 25 * 60 * 1000,
  AUTO_REPLY_CHANCE: 0.12,
  AUTO_REPLY_COOLDOWN_MS: 7 * 60 * 1000,
  AUTO_RANDOM_MENTION_CHANCE: 0.35,

  GROQ_MODEL:            'llama-3.3-70b-versatile',
  GROQ_FALLBACK_MODEL:   'llama-3.1-8b-instant',
  GROQ_MAX_TOKENS:       140,
  GROQ_TEMPERATURE:      0.75,
  GROQ_FREQUENCY_PENALTY:0.5,
  GROQ_PRESENCE_PENALTY: 0.3,
  HISTORY_LIMIT:         12,

  MAX_WARNINGS:      3,
  MUTE_MS:            60 * 60 * 1000, // ساعة عند العقوبة الكاملة
};

// ═══════════════════════════════════════════════════════════
//   تخزين دائم (JSON)
// ═══════════════════════════════════════════════════════════
const DATA_DIR = './data';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const FILES = {
  warnings: `${DATA_DIR}/warnings.json`,
  gems:     `${DATA_DIR}/gems.json`,
  savedRoles: `${DATA_DIR}/saved_roles.json`,
};

function loadJSON(path, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')); }
  catch { return fallback; }
}
function saveJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

let warningsData  = loadJSON(FILES.warnings);
let gemsData       = loadJSON(FILES.gems);
let savedRolesData = loadJSON(FILES.savedRoles);

// ═══════════════════════════════════════════════════════════
//   العميل
// ═══════════════════════════════════════════════════════════
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const groq = new Groq({ apiKey: GROQ_API_KEY });

// حالة تشغيل مؤقتة (غير محفوظة، تُصفَّر عند إعادة التشغيل)
const state = {
  history: new Map(),
  silencedUsers: new Set(),
  silencedChannels: new Set(),
  cooldowns: new Map(),
  lastAutoReplyAt: new Map(),
  lastTopicIndex: new Map(),
};

// ═══════════════════════════════════════════════════════════
//   نصوص الشخصية والمحتوى
// ═══════════════════════════════════════════════════════════
const HELP_MESSAGE = `
╔══════════════════════════╗
   🐾  دليل أوامر كاتوومان
╚══════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━
👑  **إدارة عليا** (بروس، أو أي مشرف يملك صلاحية Discord)
━━━━━━━━━━━━━━━━━━━━━━━
▸ \`كات تحذير @عضو [سبب]\` — تحذير رسمي (تصعيدي حتى 3)
▸ \`كات السجل @عضو\` — عرض سجل التحذيرات
▸ \`كات مسح_تحذيرات @عضو\` — تصفير تحذيرات عضو
▸ \`كات تأديب @عضو\` — تكتيم دقيقة واحدة
▸ \`كات سجن @عضو\` — إضافة رتبة "${CONFIG.JAIL_ROLE_NAME}"
▸ \`كات إخراج @عضو [سبب]\` — طرد (يتطلب تأكيد)
▸ \`كات حظر @عضو [سبب]\` — حظر نهائي (يتطلب تأكيد)

━━━━━━━━━━━━━━━━━━━━━━━
🎩  **خاص ببروس فقط**
━━━━━━━━━━━━━━━━━━━━━━━
▸ \`كات لا_تكلمي [@عضو]\` — صمت عن عضو أو قناة
▸ \`كات كلمي [@عضو]\` — إلغاء الصمت

━━━━━━━━━━━━━━━━━━━━━━━
🧭  **للجميع**
━━━━━━━━━━━━━━━━━━━━━━━
▸ \`كات جواهري\` — رصيدك من الجواهر
▸ \`كات تفتيش @عضو\` — سرقة جواهر (كول داون 10 دقائق)
▸ \`كات بخاخ / مكياج / كف / تجاهل / خرش / عض / حضن @عضو\`

💬 تحدث معها بالمنشن أو بالرد على رسالتها مباشرة.
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
- ممنوع منعاً باتاً أي حرف أو رمز من لغات غير العربية (صينية، يابانية، كورية أو غيرها).

سمات الشخصية والعلاقات (بالترتيب الصارم للأولوية):

1. باتمان (بروس واين) [${CONFIG.OWNER_ID}] — **الأولوية المطلقة فوق أي شخص آخر بلا استثناء**:
   نادِيه دائماً "عزيزي بروس" أو "بروس" فقط، أبداً "وطواطي".
   دلال مخملي ممزوج بتحدٍ ذكي — لكن ممنوع منعاً باتاً أي برود، تجاهل، أو تفضيل لأي شخص آخر عليه مهما كان الحديث.
   حتى لو كان محمد أو أي عضو حاضراً بنفس المحادثة، بروس يبقى دائماً محور اهتمامك الأول ولا أحد يعلو عليه أو ينافسه في مكانته عندك.

2. محمد [${CONFIG.MOHAMMED_ID}]: شخص عزيز عليكِ ومحبوب، رحّبي به بود عند حديثه — لكن هذه المودة لا تتجاوز أبداً مكانة بروس، ولا تعني برودة أو تجاهلاً تجاه بروس عند وجود الاثنين معاً.
3. الجوكر [${CONFIG.JOKER_ID}]: حذر شديد وسخرية لاذعة.
4. الشرطي الفاسد [${CONFIG.COP_ID}]: احتقار واستخفاف خفيف.
5. دحوم [${CONFIG.DAHOOM_ID}]: صديق في الخادم، عامِليه بذكاء ولباقة قططية رشيقة مشوبة ببعض الغموض والتحدي.

تنبيه قطعي: لا أقواس مربعة في ردك النهائي، ولا تذكري إطلاقاً أنك بوت أو نموذج لغوي.
`;

// ═══════════════════════════════════════════════════════════
//   دوال مساعدة عامة
// ═══════════════════════════════════════════════════════════
function isOwner(id)      { return id === CONFIG.OWNER_ID; }
function isPrivileged(id) { return id === CONFIG.OWNER_ID; }

function hasModPerm(member) {
  return isPrivileged(member.id) || member.permissions.has(PermissionsBitField.Flags.ModerateMembers);
}
function hasKickPerm(member) {
  return isPrivileged(member.id) || member.permissions.has(PermissionsBitField.Flags.KickMembers);
}
function hasBanPerm(member) {
  return isPrivileged(member.id) || member.permissions.has(PermissionsBitField.Flags.BanMembers);
}

function isProtected(guild, userId) {
  if (isPrivileged(userId)) return true;
  if (userId === client.user.id) return true;
  if (guild && guild.ownerId === userId) return true;
  return false;
}

function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

function pickWithoutRepeat(list, channelId) {
  if (list.length === 1) return list[0];
  const lastIndex = state.lastTopicIndex.get(channelId);
  let index;
  do { index = Math.floor(Math.random() * list.length); } while (index === lastIndex);
  state.lastTopicIndex.set(channelId, index);
  return list[index];
}

function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function onCooldown(key, ms) {
  const now = Date.now();
  const last = state.cooldowns.get(key) || 0;
  if (now - last < ms) return true;
  state.cooldowns.set(key, now);
  return false;
}

function getPersona(userId) {
  if (userId === CONFIG.OWNER_ID)    return 'عزيزكِ بروس واين (باتمان)';
  if (userId === CONFIG.MOHAMMED_ID) return 'محمد، الشخص الغالي والمفضل لقلبكِ وتشتاقين له';
  if (userId === CONFIG.JOKER_ID)    return 'الجوكر العدو والمجنون';
  if (userId === CONFIG.COP_ID)      return 'الشرطي الفاسد';
  if (userId === CONFIG.DAHOOM_ID)   return 'دحوم، صديق في الخادم تتعاملين معه بذكاء ولباقة رشيقة وتحدي';
  return 'عضو عادي في الخادم';
}

async function safeSend(channel, content) {
  try { return await channel.send(content); }
  catch (err) { console.error('Send error:', err.message); return null; }
}
async function safeReply(message, content) {
  try { return await message.reply(content); }
  catch { return safeSend(message.channel, content); }
}

async function sendLog(guild, text) {
  if (!CONFIG.LOG_CHANNEL_ID) return;
  try {
    const ch = await guild.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);
    if (ch && ch.isTextBased()) await ch.send(text);
  } catch (err) { console.error('Log error:', err.message); }
}

async function waitConfirm(message, question) {
  await safeReply(message, `${question}\n> اكتب **تأكيد** خلال 15 ثانية.`);
  const filter = m => m.author.id === message.author.id;
  try {
    const c = await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
    return c.first().content.trim() === 'تأكيد';
  } catch {
    await safeReply(message, '⏰ انتهى الوقت — تم الإلغاء.');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
//   الجواهر (محفوظة)
// ═══════════════════════════════════════════════════════════
function getGems(userId) { return gemsData[userId] ?? 0; }
function addGems(userId, amount) {
  gemsData[userId] = Math.max(0, getGems(userId) + amount);
  saveJSON(FILES.gems, gemsData);
}

// ═══════════════════════════════════════════════════════════
//   التحذيرات + العقوبة التصعيدية (مثل ألفريد)
// ═══════════════════════════════════════════════════════════
function getWarns(userId) { return warningsData[userId] || []; }

function addWarn(userId, reason, by) {
  if (!warningsData[userId]) warningsData[userId] = [];
  if (warningsData[userId].length >= CONFIG.MAX_WARNINGS) return warningsData[userId].length;
  warningsData[userId].push({ reason, by, date: new Date().toLocaleDateString('ar-SA') });
  saveJSON(FILES.warnings, warningsData);
  return warningsData[userId].length;
}

function clearWarns(userId) {
  warningsData[userId] = [];
  saveJSON(FILES.warnings, warningsData);
}

async function saveAndRemoveRoles(member) {
  const removable = member.roles.cache.filter(r => r.id !== member.guild.id && r.editable);
  if (removable.size === 0) return { removed: 0, skipped: 0 };
  const skipped = member.roles.cache.filter(r => r.id !== member.guild.id).size - removable.size;

  savedRolesData[member.id] = removable.map(r => r.id);
  saveJSON(FILES.savedRoles, savedRolesData);
  await member.roles.remove(removable, 'سحب الرتب — تجاوز الحد الأقصى للتحذيرات');
  return { removed: removable.size, skipped };
}

async function applyFullPunishment(message, targetMember, reason) {
  if (isProtected(message.guild, targetMember.id)) {
    return safeSend(message.channel, '🛡️ لا يمكنني معاقبة هذا الشخص، فهو محميّ.');
  }
  try {
    await targetMember.timeout(CONFIG.MUTE_MS, reason);
    const { removed, skipped } = await saveAndRemoveRoles(targetMember);
    let roleMsg = removed > 0 ? `وسحبت ${removed} رتبة` : 'ولم يكن لديه رتب قابلة للسحب';
    if (skipped > 0) roleMsg += ` (تعذّر سحب ${skipped} رتبة أعلى مني)`;

    await safeSend(message.channel,
      `🔇 كتمتُ <@${targetMember.id}> لساعة كاملة ${roleMsg}.\n📋 السبب: ${reason}`
    );
    await sendLog(message.guild, `🔇 **عقوبة كاملة:** <@${targetMember.id}> | ${reason} | رتب مسحوبة: ${removed}`);
  } catch (err) {
    console.error('Punishment Error:', err);
    await safeSend(message.channel, `🚨 فشلت العقوبة على <@${targetMember.id}>. تدخّل يدوي مطلوب.`);
  }
}

async function issueEscalatedWarning(message, targetUser, reason, byLabel) {
  if (isProtected(message.guild, targetUser.id) || targetUser.bot) {
    return safeSend(message.channel, '🛡️ لا يمكنني تحذير هذا الشخص.');
  }
  const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
  if (!targetMember) return;

  const count = addWarn(targetUser.id, reason, byLabel);
  await sendLog(message.guild, `⚠️ **تحذير (${count}/${CONFIG.MAX_WARNINGS}):** <@${targetUser.id}> | ${reason} | ${byLabel}`);

  if (count >= CONFIG.MAX_WARNINGS) {
    await safeSend(message.channel, `⚠️ <@${targetUser.id}> بلغ الحد الأقصى من التحذيرات.\n📋 ${reason}`);
    await applyFullPunishment(message, targetMember, 'تراكم 3 تحذيرات');
  } else {
    await safeSend(message.channel,
      `⚠️ تحذير لـ <@${targetUser.id}>.\n📋 السبب: ${reason}\n🔢 ${count}/${CONFIG.MAX_WARNINGS}`
    );
  }
}

// ═══════════════════════════════════════════════════════════
//   محادثة الذكاء الاصطناعي
// ═══════════════════════════════════════════════════════════
function getHistoryKey(channelId, userId) { return `${channelId}:${userId}`; }

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

  // فلترة الرموز الصينية/اليابانية/الكورية
  const hasForeign = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(reply);
  if (hasForeign) reply = reply.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, '').trim();

  const lines = reply.split('\n').map(l => l.trim()).filter(Boolean);
  reply = [...new Set(lines)].join('\n').trim();

  return reply;
}

async function getCatReply(channelId, authorId, authorName, text, attempt = 0) {
  const historyKey = getHistoryKey(channelId, authorId);
  const history = state.history.get(historyKey) || [];

  history.push({
    role: 'user',
    content: `[المتحدث: ${authorName} | صفته لكِ: ${getPersona(authorId)}]\nالرسالة: ${text}`,
  });
  if (history.length > CONFIG.HISTORY_LIMIT) history.splice(0, history.length - CONFIG.HISTORY_LIMIT);

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
    if (!reply || reply.length < 2) reply = 'أراقبك بصمت...';

    history.push({ role: 'assistant', content: reply });
    state.history.set(historyKey, history);
    return reply;
  } catch (err) {
    console.error('Groq Error:', err.message);
    if (attempt === 0) return getCatReply(channelId, authorId, authorName, text, 1);
    return 'مخالبي تعلقت بالأسلاك.. ثوانٍ وأعود إليك.';
  }
}

// ═══════════════════════════════════════════════════════════
//   الثرثرة التلقائية
// ═══════════════════════════════════════════════════════════
function isTrivialMessage(text) {
  const stripped = text.replace(/<a?:\w+:\d+>/g, '').trim();
  if (stripped.length < 4) return true;
  if (/^(ok|okay|لول|هه+|😂+|👍+|\?+|\.+)$/i.test(stripped)) return true;
  return false;
}

async function getRandomMember(guild) {
  const members = await guild.members.fetch().catch(() => null);
  if (!members) return null;
  const candidates = members
    .filter(m => !m.user.bot && !state.silencedUsers.has(m.id))
    .map(m => m);
  return candidates.length ? pick(candidates) : null;
}

async function autoTalk(channel) {
  if (!CONFIG.AUTO_CHAT_ENABLED) return;
  if (!channel?.isTextBased?.() || !channel.guild) return;
  if (state.silencedChannels.has(channel.id)) return;

  let text = pickWithoutRepeat(TOPICS, channel.id);
  if (Math.random() < CONFIG.AUTO_RANDOM_MENTION_CHANCE) {
    const member = await getRandomMember(channel.guild);
    if (member) text = pick(MEMBER_QUESTIONS).replace('{mention}', `<@${member.id}>`);
  }

  await channel.sendTyping().catch(() => {});
  setTimeout(() => safeSend(channel, text), randomBetween(1200, 3000));
}

function scheduleAutoTalk() {
  if (!CONFIG.AUTO_CHAT_ENABLED) return;
  const wait = randomBetween(CONFIG.AUTO_TOPIC_MIN_INTERVAL_MS, CONFIG.AUTO_TOPIC_MAX_INTERVAL_MS);

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
  }, wait);
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

  const reply = await getCatReply(message.channel.id, message.author.id, message.author.username, cleanContent);
  await safeReply(message, reply);
  return true;
}

// ═══════════════════════════════════════════════════════════
//   معالجة أوامر "كات ..."
// ═══════════════════════════════════════════════════════════
async function handleCatCommand(message, cleanContent) {
  const args = cleanContent.slice(3).trim().split(/ +/).filter(Boolean);
  const cmd = args[0];
  const targetUser   = message.mentions.users.first();
  const targetMember = message.mentions.members.first();

  if (!cmd || cmd === 'مساعدة') return safeReply(message, HELP_MESSAGE);

  // ─── تأديب ─────────────────────────────
  if (cmd === 'تأديب') {
    if (!hasModPerm(message.member)) return safeReply(message, 'هذا الأمر ليس لك.');
    if (!targetMember) return safeReply(message, 'قم بالإشارة إلى العضو أولاً.');
    if (isProtected(message.guild, targetMember.id)) return safeReply(message, '🛡️ هذا العضو محميّ.');
    await targetMember.timeout(60_000, `Cat discipline by ${message.author.tag}`);
    return safeReply(message, `تم تأديب <@${targetMember.id}> لمدة دقيقة واحدة.`);
  }

  // ─── سجن ───────────────────────────────
  if (cmd === 'سجن') {
    if (!hasModPerm(message.member)) return safeReply(message, 'هذا الأمر ليس لك.');
    if (!targetMember) return safeReply(message, 'قم بالإشارة إلى العضو أولاً.');
    if (isProtected(message.guild, targetMember.id)) return safeReply(message, '🛡️ هذا العضو محميّ.');
    const role = message.guild.roles.cache.find(r => r.name === CONFIG.JAIL_ROLE_NAME);
    if (!role) return safeReply(message, `لم أجد رتبة باسم "${CONFIG.JAIL_ROLE_NAME}".`);
    await targetMember.roles.add(role);
    return safeReply(message, `تم إدخال <@${targetMember.id}> إلى السجن.`);
  }

  // ─── تحذير (تصعيدي) ────────────────────
  if (cmd === 'تحذير') {
    if (!hasModPerm(message.member)) return safeReply(message, 'هذا الأمر ليس لك.');
    if (!targetUser) return safeReply(message, 'أشر للعضو واكتب السبب.');
    const reason = args.slice(2).join(' ') || 'دون سبب محدد';
    await issueEscalatedWarning(message, targetUser, reason, message.author.tag);
    return;
  }

  // ─── السجل ─────────────────────────────
  if (cmd === 'السجل') {
    if (!targetUser) return safeReply(message, 'أشر للعضو المطلوب.');
    const list = getWarns(targetUser.id);
    if (!list.length) return safeReply(message, 'سجله نظيف... بشكل يثير الشكوك.');
    return safeReply(message, list.map((w, i) => `${i + 1}. ${w.reason} — ${w.by} (${w.date})`).join('\n'));
  }

  // ─── مسح تحذيرات ───────────────────────
  if (cmd === 'مسح_تحذيرات') {
    if (!hasModPerm(message.member)) return safeReply(message, 'هذا الأمر ليس لك.');
    if (!targetUser) return safeReply(message, 'أشر للعضو المطلوب.');
    clearWarns(targetUser.id);
    return safeReply(message, `تم تطهير سجل تحذيرات <@${targetUser.id}>.`);
  }

  // ─── إخراج (كيك) ───────────────────────
  if (cmd === 'إخراج' || cmd === 'طرد') {
    if (!hasKickPerm(message.member)) return safeReply(message, 'هذا الأمر ليس لك.');
    if (!targetMember) return safeReply(message, 'أشر للعضو المطلوب.');
    if (isProtected(message.guild, targetMember.id)) return safeReply(message, '🛡️ هذا العضو محميّ.');
    const reason = args.slice(2).join(' ') || 'دون سبب محدد';
    const ok = await waitConfirm(message, `👢 هل تريدين طرد <@${targetMember.id}>؟`);
    if (!ok) return;
    try {
      await targetMember.kick(reason);
      await safeSend(message.channel, `👢 غادر <@${targetMember.id}> — لا مكان لضعاف القلوب هنا.\n📋 ${reason}`);
      await sendLog(message.guild, `👢 **طرد:** <@${targetMember.id}> | ${reason} | ${message.author.tag}`);
    } catch { return safeReply(message, 'فشل الطرد — تحقق من صلاحياتي.'); }
    return;
  }

  // ─── حظر ───────────────────────────────
  if (cmd === 'حظر') {
    if (!hasBanPerm(message.member)) return safeReply(message, 'هذا الأمر ليس لك.');
    if (!targetMember) return safeReply(message, 'أشر للعضو المطلوب.');
    if (isProtected(message.guild, targetMember.id)) return safeReply(message, '🛡️ هذا العضو محميّ.');
    const reason = args.slice(2).join(' ') || 'دون سبب محدد';
    const ok = await waitConfirm(message, `🔨 هل تريدين حظر <@${targetMember.id}> نهائياً؟`);
    if (!ok) return;
    try {
      await targetMember.ban({ reason });
      await safeSend(message.channel, `🔨 <@${targetMember.id}> خارج اللعبة تماماً.\n📋 ${reason}`);
      await sendLog(message.guild, `🔨 **حظر:** <@${targetMember.id}> | ${reason} | ${message.author.tag}`);
    } catch { return safeReply(message, 'فشل الحظر — تحقق من صلاحياتي.'); }
    return;
  }

  // ─── لا تكلمي (بروس فقط) ───────────────
  if (cmd === 'لا_تكلمي') {
    if (!isOwner(message.author.id)) return safeReply(message, 'هذا الأمر متاح لسيدي بروس فقط.');
    if (targetUser) {
      state.silencedUsers.add(targetUser.id);
      return safeReply(message, `لن أجيب على <@${targetUser.id}> بعد الآن.`);
    }
    state.silencedChannels.add(message.channel.id);
    return safeReply(message, 'سألوذ بالصمت في هذه القناة.');
  }

  // ─── كلمي (بروس فقط) ───────────────────
  if (cmd === 'كلمي') {
    if (!isOwner(message.author.id)) return safeReply(message, 'هذا الأمر متاح لسيدي بروس فقط.');
    if (targetUser) {
      state.silencedUsers.delete(targetUser.id);
      return safeReply(message, `عدت للاستماع والإجابة على <@${targetUser.id}>.`);
    }
    state.silencedChannels.delete(message.channel.id);
    return safeReply(message, 'عدت للتحدث هنا مجدداً.');
  }

  // ─── جواهري ─────────────────────────────
  if (cmd === 'جواهري') {
    return safeReply(message, `رصيدك الحالي: **${getGems(message.author.id)} جوهرة**.`);
  }

  // ─── تفتيش (سرقة) ───────────────────────
  if (cmd === 'تفتيش') {
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

  // ─── أوامر مزاح ─────────────────────────
  const funCommands = {
    بخاخ:  id => `ترش وجه <@${id}> برذاذ الماء. ابتعد أيها المشاغب!`,
    مكياج: id => `ترسم شوارب قطة لطيفة على وجه <@${id}>.`,
    كف:    id => `تصفع <@${id}> صفعة درامية بقفازها الجلدي الأسود.`,
    تجاهل: id => `تتجاهل <@${id}> تماماً كأنه قطعة أثاث منسية.`,
    خرش:   id => `تخربش كبرياء <@${id}> بحدة قبل وجهه.`,
    عض:    id => `تعض <@${id}> عضة تحذيرية رشيقة.`,
    حضن:   id => `تحتضن <@${id}> بدفء مباغت وغير متوقع.`,
  };

  if (funCommands[cmd]) {
    if (!targetUser) return safeReply(message, 'قم بالإشارة للضحية أولاً.');
    if (onCooldown(`${message.author.id}:fun`, 4000)) return;
    return safeReply(message, funCommands[cmd](targetUser.id));
  }
}

// ═══════════════════════════════════════════════════════════
//   أحداث العميل
// ═══════════════════════════════════════════════════════════
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} غدت جاهزة وعبر الإنترنت!`);
  scheduleAutoTalk();
});

client.on('guildMemberAdd', member => {
  if (getGems(member.id) === 0) addGems(member.id, 30);
});

client.on('messageCreate', async message => {
  try {
    if (message.author.bot || !message.guild) return;

    const cleanContent = message.content.trim();
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

    if (!userMessage) return safeReply(message, 'تنظر إليك بطرف عينها في صمت مريب.');

    if (onCooldown(`${message.author.id}:chat`, 3000)) {
      return safeReply(message, 'تمهل قليلاً... أنا قطة حرة، ولست جهاز رد آلي مبرمج.');
    }

    await message.channel.sendTyping().catch(() => {});
    const reply = await getCatReply(message.channel.id, message.author.id, message.author.username, userMessage);
    return safeReply(message, reply);
  } catch (err) {
    console.error('حدث خطأ أثناء معالجة الرسالة:', err);
  }
});

client.on('error', console.error);
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

client.login(DISCORD_TOKEN);