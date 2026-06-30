const { Client, GatewayIntentBits, PermissionsBitField, ActivityType } = require('discord.js');
const Groq = require('groq-sdk');
const fs = require('fs');

// ===== الإعدادات الأساسية =====
const TOKEN = process.env.CATWOMAN_TOKEN || process.env.DISCORD_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const BRUCE_ID = 'YOUR_BRUCE_DISCORD_ID'; // ضع الآيدي الخاص بك هنا (بروس واين)
const MOHAMMED_ID = 'YOUR_MOHAMMED_DISCORD_ID'; // ضع آيدي محمد هنا

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
  warnData: {},        // { userId: [ { reason, by, date } ] }
  gems: {},            // { userId: gemsCount }
  reputation: {},      // { userId: "مزعج" | "مألوف" | "تحت_المراقبة" }
  chatterEnabled: true,
  chatterChannelId: null,
  lastChatterTime: 0
};

// تحميل البيانات
if (fs.existsSync(DATA_FILE)) {
  try { state = { ...state, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) }; } catch (e) { console.error(e); }
}
function saveData() { fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8'); }

// نظام المزاج المتغير
const MOODS = ['لعوبة', 'باردة', 'غاضبة', 'مشتاقة'];
let currentMood = 'لعوبة';
setInterval(() => {
  currentMood = MOODS[Math.floor(Math.random() * MOODS.length)];
  client.user.setActivity(`بمزاج: ${currentMood}`, { type: ActivityType.Custom });
}, 1000 * 60 * 60); // يتغير المزاج كل ساعة

const conversations = {};

// ===== الدوال المساعدة =====
function isPrivileged(member) {
  return member.id === BRUCE_ID || member.id === MOHAMMED_ID || member.permissions.has(PermissionsBitField.Flags.Administrator);
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

// ===== النظام السيستمي للبرومبت المتغير حسب المزاج والسمعة =====
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

// ===== حدث تشغيل البوت =====
client.once('ready', () => {
  console.log(`🐱 سلـينيا كايل في الخدمة باسم: ${client.user.tag}`);
  client.user.setActivity(`بمزاج: ${currentMood}`, { type: ActivityType.Custom });
  
  // حلقة فحص الثرثرة التلقائية الذكية (تتفقد كل 5 دقائق)
  setInterval(async () => {
    if (!state.chatterEnabled || !state.chatterChannelId) return;
    const now = Date.now();
    if (now - state.lastChatterTime < 1000 * 60 * 30) return; // الفاصل الأدنى 30 دقيقة لو الشات ساكت

    const channel = client.channels.cache.get(state.chatterChannelId);
    if (!channel) return;

    try {
      const messages = await channel.messages.fetch({ limit: 7 });
      const lastMessage = messages.first();
      // إذا كانت آخر رسالة منذ أقل من 10 دقائق، فهذا يعني أن الشات نشط حالياً، فلن تتدخل
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
    } catch (err) { console.error('Chatter Error:', err); }
  }, 1000 * 60 * 5);
});

// ===== حدث معالجة الرسائل والأوامر =====
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const cleanContent = message.content.trim();
  const args = cleanContent.split(/ +/);
  const isMentioned = message.mentions.has(client.user) || message.reference;

  // تثبيت قناة الثرثرة التلقائية عند أول استخدام لأوامر التحكم
  if (!state.chatterChannelId && cleanContent.startsWith('كات')) {
    state.chatterChannelId = message.channel.id;
    saveData();
  }

  // 1. ===== أوامر التحكم الخاصة ببروس (المالك) =====
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
      state.lastChatterTime = 0; // تصفير العداد لإجبار الفحص التلقائي على العمل فوراً
      return message.reply('😼 سأتحين فرصة السكون القادمة لأرمي بكلماتي المستفزة..');
    }
  }

  // 2. ===== الأوامر الإدارية والسيادية (للمشرفين فقط) =====
  if (cleanContent.startsWith('كات')) {
    const cmd = args[1];
    const targetMember = message.mentions.members.first();

    // أمر قفل وقناة
    if (cmd === 'إغلاق') {
      if (!isPrivileged(message.member)) return message.reply('❌ المخالب حادة لكن صلاحياتك لا تسمح لك بقفل المكان.');
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
      return message.channel.send('🔒 **أغلقت الأبواب.. لا صوت يعلو فوق صوت مواء القطط هنا الآن.**');
    }
    if (cmd === 'فتح') {
      if (!isPrivileged(message.member)) return message.reply('❌ لست أنت من يقرر فتح النوافذ.');
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
      return message.channel.send('🔓 **فتحت المخارج.. تنفسوا بحرية مجدداً ولكن بحذر.**');
    }

    // نظام التحذير الاحترافي مع العقاب السينمائي وسحب الرتب
    if (cmd === 'تحذير') {
      if (!isPrivileged(message.member)) return message.reply('❌ إصدار الأحكام من شيم الأسياد فقط.');
      if (!targetMember) return message.reply('🎯 من هو الضحية؟ حدده بالمنشن.');
      
      const reason = args.slice(3).join(' ') || 'سلوك غير لائق في شوارع غوثام';

      // فحص مسبق للتحذيرات
      if (state.warnData[targetMember.id] && state.warnData[targetMember.id].length >= 3) {
        return message.reply(`⛔ <@${targetMember.id}> استنفد كافة الفرص ولديه (3/3) تحذيرات وهو قيد الاحتجاز الفعلي.`);
      }

      const count = addWarn(targetMember.id, reason, message.author.tag);
      updateReputation(targetMember.id, 'تحت المراقبة');

      await message.channel.send(
        `⚠️ **سوط كاتوومان يلتف!** تم تحذير <@${targetMember.id}> بواسطة **${message.author.username}**.\n` +
        `📋 **السبب:** ${reason}\n` +
        `🔢 **مجموع التحذيرات:** ${count}/3`
      );

      // العقوبة عند الوصول إلى 3
      if (count >= 3) {
        try {
          updateReputation(targetMember.id, 'مزعج');
          // كتم ساعة
          await targetMember.timeout(60 * 60 * 1000, 'تجاوز حد التحذيرات الثلاثة');
          // سحب كافة الرتب
          const rolesToRemove = targetMember.roles.cache.filter(r => r.id !== message.guild.id);
          await targetMember.roles.remove(rolesToRemove, 'تجريد كامل بسبب عقوبة كاتوومان القصوى');
          
          await message.channel.send(
            `🐈‍⬛ **سحقاً.. نقرت كعبي بالأرض وانتهى الأمر!**\n` +
            `تم تكتيم <@${targetMember.id}> لمدة ساعة كاملة، وجُرد من كافة رتبه وصلاحياته ليتعلم اللياقة والقوانين. ⛓️`
          );
        } catch (err) {
          console.error(err);
          await message.channel.send(`🚨 <@${BRUCE_ID}> يا سيدي بروس! حاولت تطبيق العقوبة وسحب رتب <@${targetMember.id}> لكن صلاحياتي قُيدت! يرجى التدخل يدوياً.`);
        }
      }
      return;
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
      updateReputation(targetMember.id, 'عادي');
      saveData();
      return message.reply(`🗑️ تم تمزيق ملف تحذيرات **${targetMember.user.username}** وعاد لصفحة بيضاء.`);
    }

    // أمر تأديب (تايم أوت دقيقة)
    if (cmd === 'تأديب') {
      if (!isPrivileged(message.member)) return message.reply('❌ لست مؤهلاً لتربية أحد هنا.');
      if (!targetMember) return message.reply('🎯 من تريد تأديبه؟');
      try {
        await targetMember.timeout(60 * 1000, 'تأديب سريع من كاتوومان');
        return message.reply(`🤫 *حركة خاطفة بالسوط..* تم إسكات **${targetMember.user.username}** لمدة دقيقة واحدة لتهدئة أعصابه.`);
      } catch { return message.reply('❌ فشلت دقيقة التأديب، يبدو أن قوته تفوق مخالبي الحالية.'); }
    }

    // 3. ===== أوامر التفاعل والترفيه الجماهيري (متاحة للجميع الآن!) =====
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
      
      // لمسة احترافية: تخصيص رد الحضن أو الكف إذا كان لباتمان أو محمد
      let customReply = interactions[cmd].replace('{target}', `<@${targetMember.id}>`);
      if (targetMember.id === BRUCE_ID && cmd === 'حضن') {
        customReply = `🐈‍⬛ 🫂 التفتت سلينيا حول <@${BRUCE_ID}>، وهمست في أذنه: "ليالي غوثام باردة بدونك يا وطواط.." دافئ وعميق بشكل خاص.`;
      } else if (targetMember.id === MOHAMMED_ID && cmd === 'حضن') {
        customReply = `💖 حضن دافئ جداً ومليء بالمعزة والاشتياق لـ <@${MOHAMMED_ID}>، المفضل دائماً وأبدأ!`;
      }
      return message.channel.send(customReply);
    }

    // رصيد الجواهر ونظام التفتيش الكوميدي
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

    // أمر مطلوب للعدالة الكوميدي
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

  // 4. ===== نظام المحادثة الذكية التفاعلية عبر Groq (عند المنشن والرد) =====
  if (isMentioned && !cleanContent.startsWith('كات')) {
    await message.channel.sendTyping();
    
    const userId = message.author.id;
    if (!conversations[userId]) conversations[userId] = [];
    
    conversations[userId].push({ role: 'user', content: cleanContent });
    if (conversations[userId].length > 12) conversations[userId] = conversations[userId].slice(-12);

    try {
      const systemPrompt = generateSystemPrompt(userId, message.author.username);
      
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversations[userId]
        ],
        max_tokens: 120,
        temperature: 0.6
      });

      let reply = completion.choices[0].message.content.trim();
      conversations[userId].push({ role: 'assistant', content: reply });

      return message.reply(`🐈‍⬛ ${reply}`);
    } catch (err) {
      console.error(err);
      return message.reply('🐾 *تعثرت ببعض الأسلاك المقطوعة في أسطح غوثام.. حاول مجدداً لاحقاً.*');
    }
  }
});

client.login(TOKEN);
