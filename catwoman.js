const { Client, GatewayIntentBits, PermissionsBitField, ActivityType } = require('discord.js');
const Groq = require('groq-sdk');
const fs = require('fs');

// ===== الإعدادات الأساسية =====
const TOKEN = process.env.CATWOMAN_TOKEN || process.env.DISCORD_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ضع الآيديات الحقيقية هنا
const BRUCE_ID    = '648818494808391696';
const MOHAMMED_ID = '839706219870814218';
const JOKER_ID    = '1052545362533023754';
const ALFRED_ID   = 'ALFRED_BOT_ID_HERE'; // ← ضع آيدي بوت ألفريد هنا

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const groq = new Groq({ apiKey: GROQ_API_KEY });

// ===== قاعدة البيانات والحالة المستمرة =====
const DATA_FILE = './catwoman_data.json';
let state = {
  warnData: {},
  gems: {},
  reputation: {},
  chatterEnabled: true,
  chatterChannelId: null,
  lastChatterTime: 0,
  savedRoles: {} // { userId: [roleId, ...] }
};

if (fs.existsSync(DATA_FILE)) {
  try { state = { ...state, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) }; } catch (e) { console.error(e); }
}
function saveData() { fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8'); }

// ===== نظام المزاج المتغير =====
const MOODS = ['لعوبة', 'باردة', 'غاضبة', 'مشتاقة'];
let currentMood = 'لعوبة';
setInterval(() => {
  currentMood = MOODS[Math.floor(Math.random() * MOODS.length)];
  client.user.setActivity(`بمزاج: ${currentMood}`, { type: ActivityType.Custom }).catch(() => {});
}, 1000 * 60 * 60);

// ===== المحادثات (مخزنة لكل قناة، مش لكل مستخدم) =====
const conversations = {};

// ===== نظام التبادل مع ألفريد (منع اللوب اللانهائي) =====
const MAX_BOT_EXCHANGE = 3;
const botExchangeCounts = {}; // channelId -> count
const BOT_COOLDOWN_MS = 60 * 1000;
const lastBotReply = {}; // channelId -> timestamp

// ===== كول داون عام للمحادثة الذكية =====
const chatCooldowns = {}; // userId -> timestamp
const CHAT_COOLDOWN_MS = 5 * 1000;

// ===== الدوال المساعدة =====
function isPrivileged(member) {
  return member.id === BRUCE_ID || member.id === MOHAMMED_ID || member.permissions.has(PermissionsBitField.Flags.Administrator);
}

function isProtected(userId) {
  return userId === BRUCE_ID || userId === MOHAMMED_ID || userId === client.user.id;
}

function getMemberReputation(userId) {
  if (userId === BRUCE_ID) return 'باتمان الخواجة';
  if (userId === MOHAMMED_ID) return 'المفضل والغالي';
  return state.reputation[userId] || 'عادي';
}

function updateReputation(userId, type) {
  if (userId === BRUCE_ID || userId === MOHAMMED_ID) return;
  state.reputation[userId] = type;
  saveData();
}

function addWarn(userId, reason, byTag) {
  if (!state.warnData[userId]) state.warnData[userId] = [];
  if (state.warnData[userId].length >= 3) return 3;
  state.warnData[userId].push({ reason, by: byTag, date: new Date().toLocaleDateString('ar-SA') });
  saveData();
  return state.warnData[userId].length;
}

// تحقق هل البوت يقدر يأثر على العضو (رتبة أعلى)
function canModerate(guild, targetMember) {
  if (!targetMember) return false;
  if (targetMember.id === guild.ownerId) return false;
  const botMember = guild.members.me;
  if (!botMember) return false;
  return botMember.roles.highest.position > targetMember.roles.highest.position;
}

// سحب آمن للرتب (فقط القابلة للإدارة) مع حفظها
async function safeRemoveRoles(member) {
  const removable = member.roles.cache.filter(r => r.id !== member.guild.id && r.editable);
  if (removable.size === 0) return { removed: 0, skipped: member.roles.cache.size - 1 };
  state.savedRoles[member.id] = removable.map(r => r.id);
  saveData();
  try {
    await member.roles.remove(removable, 'عقوبة كاتوومان القصوى');
    return { removed: removable.size, skipped: member.roles.cache.size - 1 - removable.size };
  } catch (err) {
    console.error('Remove Roles Error:', err.message);
    return { removed: 0, skipped: removable.size };
  }
}

// ===== البرومبت المتغير حسب المزاج والسمعة =====
function generateSystemPrompt(userId, username) {
  const rep = getMemberReputation(userId);
  return `أنتِ كاتوومان (سلينيا كايل - Catwoman) من عالم DC.
شخصيتكِ: غامضة، ذكية، لعوبة، حرة، تعشق الجواهر والسرقة، وتتحرك بخفة القطط.
مزاجكِ الحالي الآن هو: [${currentMood}]. تصرفي بناءً على هذا المزاج تماماً!
هذا العضو الذي يخاطبكِ اسمه (${username}) ونظرتكِ له وسعمتكِ عنه أنه: [${rep}].
إذا كان بروس واين أو باتمان، تعاملي بمزيج من التحدي، الإثارة، العاطفة المخفية الكلاسيكية.
إذا كان محمد، أنتِ تحبينه جداً وتشتاقين له وتفضلينه على الجميع.
إذا كان "مزعج" كوني باردة وقاسية وقصيرة الإجابة.
قواعد عامة:
- تحدثي بالعامية الفخمة أو الفصحى الحديثة الممزوجة بالدلال والخطورة.
- ردودك قصيرة ومثيرة (جملة أو جملتين كحد أقصى).
- لا تستخدمي منشن الرموز @ أبداً.`;
}

// برومبت خاص للتناقش مع ألفريد
function generateAlfredChatPrompt() {
  return `أنتِ كاتوومان (سلينيا كايل) تتحدثين مع ألفريد، خادم بروس واين الشخصي.
العلاقة بينكما: احترام متبادل مع سخرية خفية، تعرفين أنه وفي ومخلص لبروس.
كوني قصيرة جداً في ردك على ألفريد (جملة واحدة فقط)، ساخرة أحياناً، لكن مهذبة.
مزاجك الحالي: [${currentMood}].
لا تستخدمي منشنات @ أبداً.`;
}

// ===== دالة توليد رد كاتوومان =====
async function getCatwomanReply(channelId, userId, username, userMessage, isAlfred = false) {
  if (!conversations[channelId]) conversations[channelId] = [];

  const systemPrompt = isAlfred
    ? generateAlfredChatPrompt()
    : generateSystemPrompt(userId, username);

  const tag = isAlfred ? `[رسالة من ألفريد]: ${userMessage}` : userMessage;
  conversations[channelId].push({ role: 'user', content: tag });

  if (conversations[channelId].length > 12) {
    conversations[channelId] = conversations[channelId].slice(-12);
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversations[channelId]
      ],
      max_tokens: isAlfred ? 60 : 120,
      temperature: 0.65
    });

    let reply = completion.choices[0].message.content.trim();
    // تنظيف المنشنات الوهمية والرموز
    reply = reply
      .replace(/<@!?\d+>/g, '')
      .replace(/@\w+/g, '')
      .replace(/:\w+:/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    conversations[channelId].push({ role: 'assistant', content: reply });
    return reply || '🐾 *تطالعك بصمت غامض*';
  } catch (err) {
    console.error('Groq Error:', err.message);
    conversations[channelId].pop();
    return '🐾 *تعثرت ببعض الأسلاك المقطوعة في أسطح غوثام.. حاول مجدداً لاحقاً.*';
  }
}

// ===== حدث تشغيل البوت =====
client.once('ready', () => {
  console.log(`🐱 سلـينيا كايل في الخدمة باسم: ${client.user.tag}`);
  client.user.setActivity(`بمزاج: ${currentMood}`, { type: ActivityType.Custom }).catch(() => {});

  // حلقة الثرثرة التلقائية الذكية (تتفقد كل 5 دقائق)
  setInterval(async () => {
    if (!state.chatterEnabled || !state.chatterChannelId) return;
    const now = Date.now();
    if (now - state.lastChatterTime < 1000 * 60 * 30) return;

    const channel = client.channels.cache.get(state.chatterChannelId);
    if (!channel) return;

    try {
      const messages = await channel.messages.fetch({ limit: 7 });
      const lastMessage = messages.first();
      if (lastMessage && (now - lastMessage.createdTimestamp < 1000 * 60 * 10)) return;

      const chatContext = messages.reverse().filter(m => !m.author.bot).map(m => `${m.author.username}: ${m.content}`).join('\n');

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `أنتِ كاتوومان. الشات هادئ تماماً الآن. ارمي تعليقاً واحداً ذكياً ساخراً أو غامضاً مستوحى من سياق آخر العبارات المتبادلة إن وجدت، أو تذمري من الملل والهدوء في غوثام ومزاجكِ الحالي هو ${currentMood}. ردك جملة قصيرة واحدة ومثيرة.` },
          { role: 'user', content: chatContext || 'القناة فارغة وساكنة' }
        ],
        max_tokens: 80,
        temperature: 0.7
      });

      let text = completion.choices[0].message.content.trim();
      if (text) {
        await channel.send(`🐈 ${text}`);
        state.lastChatterTime = Date.now();
        saveData();
      }
    } catch (err) { console.error('Chatter Error:', err.message); }
  }, 1000 * 60 * 5);
});

// ===== حدث معالجة الرسائل والأوامر =====
client.on('messageCreate', async message => {
  if (!message.guild) return;

  // ====== قسم التناقش مع ألفريد ======
  if (message.author.bot) {
    // تتفاعل فقط مع ألفريد
    if (message.author.id !== ALFRED_ID) return;

    const isMentioned = message.mentions.has(client.user);
    let isReplyToCatwoman = false;
    if (message.reference?.messageId) {
      try {
        const ref = await message.channel.messages.fetch(message.reference.messageId);
        isReplyToCatwoman = ref.author.id === client.user.id;
      } catch {}
    }

    if (!isMentioned && !isReplyToCatwoman) return;

    // كول داون بين البوتات
    const now = Date.now();
    const lastReply = lastBotReply[message.channel.id] || 0;
    if (now - lastReply < BOT_COOLDOWN_MS) return;

    // حد أقصى للتبادل
    const count = botExchangeCounts[message.channel.id] || 0;
    if (count >= MAX_BOT_EXCHANGE) return;
    botExchangeCounts[message.channel.id] = count + 1;
    lastBotReply[message.channel.id] = now;

    await message.channel.sendTyping().catch(() => {});
    setTimeout(async () => {
      const reply = await getCatwomanReply(message.channel.id, ALFRED_ID, 'ألفريد', message.content, true);
      message.reply(reply);
    }, 1500);
    return;
  }

  // أي رسالة بشرية تصفّر عداد التبادل الآلي مع ألفريد
  botExchangeCounts[message.channel.id] = 0;

  const cleanContent = message.content.trim();
  const args = cleanContent.split(/ +/);

  // تحقق صحيح من المنشن: فقط لو منشن البوت أو رد على رسالة البوت
  const isMentioned = message.mentions.has(client.user);
  let isReplyToCatwoman = false;
  if (message.reference?.messageId) {
    try {
      const ref = await message.channel.messages.fetch(message.reference.messageId);
      isReplyToCatwoman = ref.author.id === client.user.id;
    } catch {}
  }

  // تثبيت قناة الثرثرة
  if (!state.chatterChannelId && cleanContent.startsWith('كات')) {
    state.chatterChannelId = message.channel.id;
    saveData();
  }

  // 1. ===== أوامر التحكم الخاصة ببروس =====
  if (message.author.id === BRUCE_ID) {
    if (cleanContent === 'كات تشغيل_الثرثرة') {
      state.chatterEnabled = true;
      state.chatterChannelId = message.channel.id;
      saveData();
      return message.reply('🐈 حركت ذيلي... سأبدأ بمراقبة الشات والثرثرة عندما يحل الهدوء هنا.');
    }
    if (cleanContent === 'كات إيقاف_الثرثرة') {
      state.chatterEnabled = false;
      saveData();
      return message.reply('🐾 حسناً يا سيدي.. سألوذ بالصمت التام وأراقب المخالب فقط.');
    }
    if (cleanContent === 'كات حالة_الثرثرة') {
      return message.reply(`📊 الثرثرة التلقائية: **${state.chatterEnabled ? 'مفعلة ✅' : 'معطلة ❌'}** | المزاج الحالي: **[${currentMood}]**`);
    }
    if (cleanContent === 'كات تكلمي_الآن') {
      state.lastChatterTime = 0;
      return message.reply('😼 سأتحين فرصة السكون القادمة لأرمي بكلماتي المستفزة..');
    }
  }

  // 2. ===== الأوامر الإدارية =====
  if (cleanContent.startsWith('كات ')) {
    const cmd = args[1];
    const targetMember = message.mentions.members.first();

    if (cmd === 'إغلاق') {
      if (!isPrivileged(message.member)) return message.reply('❌ المخالب حادة لكن صلاحياتك لا تسمح لك بقفل المكان.');
      try {
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return message.channel.send('🔒 **أغلقت الأبواب.. لا صوت يعلو فوق صوت مواء القطط هنا الآن.**');
      } catch { return message.reply('❌ لا أملك صلاحية الإغلاق.'); }
    }
    if (cmd === 'فتح') {
      if (!isPrivileged(message.member)) return message.reply('❌ لست أنت من يقرر فتح النوافذ.');
      try {
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
        return message.channel.send('🔓 **فتحت المخارج.. تنفسوا بحرية مجدداً ولكن بحذر.**');
      } catch { return message.reply('❌ لا أملك صلاحية الفتح.'); }
    }

    // ===== تحذير مع عقوبة سحب رتب آمنة =====
    if (cmd === 'تحذير') {
      if (!isPrivileged(message.member)) return message.reply('❌ إصدار الأحكام من شيم الأسياد فقط.');
      if (!targetMember) return message.reply('🎯 من هو الضحية؟ حدده بالمنشن.');
      if (isProtected(targetMember.id)) return message.reply('🛡️ لا يمكنني تحذير هذا الشخص.');

      if (state.warnData[targetMember.id] && state.warnData[targetMember.id].length >= 3) {
        return message.reply(`⛔ <@${targetMember.id}> استنفد كافة الفرص ولديه (3/3) تحذيرات.`);
      }

      const reason = args.slice(3).join(' ') || 'سلوك غير لائق في شوارع غوثام';
      const count = addWarn(targetMember.id, reason, message.author.tag);
      updateReputation(targetMember.id, 'تحت المراقبة');

      await message.channel.send(
        `⚠️ **سوط كاتوومان يلتف!** تم تحذير <@${targetMember.id}> بواسطة **${message.author.username}**.\n` +
        `📋 **السبب:** ${reason}\n` +
        `🔢 **مجموع التحذيرات:** ${count}/3`
      );

      if (count >= 3 && canModerate(message.guild, targetMember)) {
        try {
          updateReputation(targetMember.id, 'مزعج');
          await targetMember.timeout(60 * 60 * 1000, 'تجاوز حد التحذيرات الثلاثة');
          const { removed, skipped } = await safeRemoveRoles(targetMember);

          let roleMsg = removed > 0 ? `وسحبت ${removed} رتبة` : 'ولم يكن لديه رتب قابلة للسحب';
          if (skipped > 0) roleMsg += ` (تعذّر سحب ${skipped} رتبة أعلى من صلاحياتي)`;

          await message.channel.send(
            `🐈‍⬛ **سحقاً.. نقرت كعبي بالأرض وانتهى الأمر!**\n` +
            `تم تكتيم <@${targetMember.id}> لمدة ساعة كاملة، ${roleMsg}. ⛓️`
          );
        } catch (err) {
          console.error('Punishment Error:', err.message);
          await message.channel.send(`🚨 <@${BRUCE_ID}> يا سيدي بروس! فشلت العقوبة التلقائية على <@${targetMember.id}>.`);
        }
      }
      return;
    }

    // ===== عفو: فك كتم + إعادة رتب + تصفير تحذيرات =====
    if (cmd === 'عفو') {
      if (!isPrivileged(message.member)) return message.reply('❌ لا تملك حق العفو والمغفرة.');
      if (!targetMember) return message.reply('🎯 حدد العضو للعفو عنه.');
      try {
        await targetMember.timeout(null, 'عفو رسمي').catch(() => {});
        let restored = 0, failed = 0;
        const savedIds = state.savedRoles[targetMember.id];
        if (savedIds && savedIds.length > 0) {
          const rolesToAdd = [];
          for (const rid of savedIds) {
            const role = message.guild.roles.cache.get(rid);
            if (role && role.editable) rolesToAdd.push(role); else failed++;
          }
          if (rolesToAdd.length > 0) {
            try { await targetMember.roles.add(rolesToAdd, 'إعادة الرتب بعد العفو'); restored = rolesToAdd.length; }
            catch { failed += rolesToAdd.length; }
          }
          delete state.savedRoles[targetMember.id];
        }
        state.warnData[targetMember.id] = [];
        updateReputation(targetMember.id, 'عادي');
        saveData();
        let report = restored > 0 ? `وأعدت ${restored} رتبة` : 'ولم تكن لديه رتب محفوظة';
        if (failed > 0) report += ` (تعذّرت إعادة ${failed} رتبة)`;
        return message.reply(`✅ **عفو رسمي!** <@${targetMember.id}> فك كتمه وصفرت تحذيراته، ${report}.`);
      } catch (err) {
        console.error('Pardon Error:', err.message);
        return message.reply('❌ فشل العفو.');
      }
    }

    if (cmd === 'السجل') {
      if (!targetMember) return message.reply('🎯 حدد العضو لعرض سجله.');
      const list = state.warnData[targetMember.id] || [];
      if (list.length === 0) return message.reply(`✅ **${targetMember.user.username}** ملفه نظيف تماماً في سجلاتنا.`);
      const textList = list.map((w, i) => `**${i+1}.** ${w.reason} — بواسطة ${w.by} (${w.date})`).join('\n');
      return message.reply(`📋 **سجل المخالفات لـ ${targetMember.user.username}:**\n${textList}`);
    }

    if (cmd === 'مسح_تحذيرات') {
      if (!isPrivileged(message.member)) return message.reply('❌ لا تملك حق العفو والمغفرة.');
      if (!targetMember) return message.reply('🎯 حدد العضو لمسح سجله.');
      state.warnData[targetMember.id] = [];
      delete state.savedRoles[targetMember.id];
      updateReputation(targetMember.id, 'عادي');
      saveData();
      return message.reply(`🗑️ تم تمزيق ملف تحذيرات **${targetMember.user.username}** وعاد لصفحة بيضاء.`);
    }

    if (cmd === 'تأديب') {
      if (!isPrivileged(message.member)) return message.reply('❌ لست مؤهلاً لتربية أحد هنا.');
      if (!targetMember) return message.reply('🎯 من تريد تأديبه؟');
      if (isProtected(targetMember.id)) return message.reply('🛡️ لا يمكنني تأديب هذا الشخص.');
      if (!canModerate(message.guild, targetMember)) return message.reply('🚨 لا أملك صلاحية كافية على هذا العضو.');
      try {
        await targetMember.timeout(60 * 1000, 'تأديب سريع من كاتوومان');
        return message.reply(`🤫 *حركة خاطفة بالسوط..* تم إسكات **${targetMember.user.username}** لمدة دقيقة واحدة.`);
      } catch { return message.reply('❌ فشلت دقيقة التأديب.'); }
    }

    // 3. ===== أوامر التفاعل والترفيه =====
    const interactions = {
      'بخاخ': '💦 رشت الماء في وجه {target}.. تراجع أيها اللحوح!',
      'مكياج': '💄 وضعت القليل من أحمر الشفاه والمكياج الساخر على وجه {target}.. تبدو مضحكاً الآن!',
      'كف': '✋ *طااااخ!* كف مفاجئ على وجنتي {target} ليعود لوعيه المفقود.',
      'خرش': '😾 مخالبي تركت أثراً واضحاً على وجه {target}.. لا تلمس قطة غاضبة!',
      'عض': '🦷 عضت كتف {target} بخفة مباغتة.. لمسة خطرة ومشوقة.',
      'حضن': '🫂 التفت ذراعي سلينيا حول {target}.. دفء مخملي غامض قبل الهروب في الليل.',
      'تجاهل': '🙄 أدارت ظهرها ببرود تام وتجاهلت {target} كأنها لا تراه.'
    };

    if (interactions[cmd]) {
      if (!targetMember) return message.reply('🎯 من هو الطرف الثاني في هذا المشهد المثير؟ منشنه.');
      let customReply = interactions[cmd].replace('{target}', `<@${targetMember.id}>`);
      if (targetMember.id === BRUCE_ID && cmd === 'حضن') {
        customReply = `🐈‍⬛ 🫂 التفتت سلينيا حول <@${BRUCE_ID}>، وهمست في أذنه: "ليالي غوثام باردة بدونك يا وطواط.." دافئ وعميق بشكل خاص.`;
      } else if (targetMember.id === MOHAMMED_ID && cmd === 'حضن') {
        customReply = `💖 حضن دافئ جداً ومليء بالمعزة والاشتياق لـ <@${MOHAMMED_ID}>، المفضل دائماً وأبداً!`;
      }
      return message.channel.send(customReply);
    }

    if (cmd === 'جواهري') {
      const userGems = state.gems[message.author.id] || 0;
      return message.reply(`💎 رصيدك الحالي: **${userGems} جوهرة** لامعة مسروقة بعناية.`);
    }

    if (cmd === 'تفتيش') {
      if (!targetMember) return message.reply('🎯 من تريد تفتيش جيوبه وسرقة جواهره؟');
      if (targetMember.id === message.author.id) return message.reply('❌ تسرق نفسك؟ مثير للشفقة.');
      const targetGems = state.gems[targetMember.id] || 0;
      if (targetGems <= 0) return message.reply(`🔍 فتشت جيوب **${targetMember.user.username}** ولم أجد سوى الغبار والديون.`);
      const stealAmount = Math.floor(Math.random() * Math.min(targetGems, 15)) + 1;
      state.gems[targetMember.id] = targetGems - stealAmount;
      state.gems[message.author.id] = (state.gems[message.author.id] || 0) + stealAmount;
      saveData();
      return message.channel.send(`🥷 **عملية سرقة ناجحة!** خفة يد كاتوومان تسحب **${stealAmount} جوهرة** من خزنة <@${targetMember.id}> وتضيفها لـ <@${message.author.id}>!`);
    }

    if (cmd === 'مطلوب') {
      if (!targetMember) return message.reply('🎯 من هو الهارب من العدالة؟');
      const reward = args[2] || '1,000,000$';
      return message.channel.send(
        `🚨 **WANTED // مطلوب للعدالة في غوثام** 🚨\n` +
        `👤 العضو: <@${targetMember.id}>\n` +
        `💰 المكافأة: **${reward}** حياً أو ميتاً بتهمة إثارة الفوضى وإزعاج القطط!`
      );
    }
  }

  // 4. ===== المحادثة الذكية (عند المنشن أو الرد على رسالتها) =====
  if ((isMentioned || isReplyToCatwoman) && !cleanContent.startsWith('كات')) {
    // كول داون
    const now = Date.now();
    const lastChat = chatCooldowns[message.author.id] || 0;
    if (now - lastChat < CHAT_COOLDOWN_MS) return;

    let userMessage = cleanContent.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
    if (!userMessage) return message.reply('🐾 *تطالعك بطرف عينها بصمت مريب...*');

    chatCooldowns[message.author.id] = now;
    await message.channel.sendTyping().catch(() => {});

    setTimeout(async () => {
      const reply = await getCatwomanReply(message.channel.id, message.author.id, message.author.username, userMessage);
      message.reply(reply);
    }, 1500);
  }
});

client.login(TOKEN);
