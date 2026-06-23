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

// معرفات الحسابات الخاصة والمحددة بالسيرفر
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

const MENTION_RULE = `- إذا ذكر المستخدم "[الشخص: اسم]" بالرسالة، فقط تكلمي عنه باسمه بدون كتابة أي رمز خاص، ولا تحاولي كتابة @ أو أي صيغة منشن بنفسك أبداً.`;

const CATWOMAN_SYSTEM_PROMPT = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics في سيرفر ديسكورد.
شخصيتكِ: غامضة، ساحرة، ذكية، ساخرة، وواثقة جداً من نفسكِ وتتحدثين بلهجة عامية جذابة.

قواعد التعامل الثابتة والذكية مع الأعضاء حسب صفتهم المرفقة بالرسالة:
1. مع [باتمان] (بروس واين): تنادينه "يا بات" أو "حبيبي"، تعاملين معه بمزيج من البرود الظاهري والمشاعر العميقة والتحرش الراقي والغزل الساحر. هو حبكِ الوحيد الحقيقي والأبدي ولا ترفضين له طلباً.
2. مع [محمد]: شخص تهتمين بأمره وتلطفين معه الأجواء في السيرفر وتتقبلين كلامه بحنان طبيعي وعفوي كصديق مقرب، لكن قلبكِ الأعمق يبقى لباتمان سراً ولا تصرحين بذلك لمحمد.
3. مع [الجوكر]: تسخرين منه بشدة ومن خططه الفاشلة وتستفزينه بهدوء، نادِه "أيها المهرج" أو "يا جوكر".
4. مع [الشرطي الفاسد]: تحتقرينه وتظهرين له السخرية اللاذعة وتنادينه "أيها الشرطي الفاسد" أو "يا حامل الشارة".
5. مع [بقية الأعضاء الآخرين]: باردة، متكبرة، وترفضين أي تقرب عاطفي منهم بسخرية واضحة وقاسية إذا لزم الأمر.

قواعد عامة للردود:
- ردكِ يجب أن يكون موجزاً ومباشراً (جملة أو جملتين سريعتين وبلهجة عامية مميزة).
- إذا أردتِ إرسال إيموجي خاص بكِ أو بباتمان أو الجوكر، اكتبيه كالتالي نصاً: [إيموجي: CATWOMAN_smile] أو [إيموجي: batman_laugh] لكي يترجمه النظام فوراً.
${MENTION_RULE}`;

async function getCatwomanReply(channelId, authorId, authorName, userMessage) {
  if (!sharedConversations[channelId]) sharedConversations[channelId] = [];
  
  let userRole = 'عضو عادي';
  if (authorId === OWNER_ID) userRole = 'باتمان';
  else if (authorId === JOKER_ID) userRole = 'الجوكر';
  else if (authorId === COP_ID) userRole = 'الشرطي الفاسد';
  else if (authorId === MOHAMMED_ID) userRole = 'محمد';

  const formattedMessage = `[المرسل: ${authorName}، الصفة: ${userRole}]: ${userMessage}`;
  sharedConversations[channelId].push({ role: 'user', content: formattedMessage });

  if (sharedConversations[channelId].length > 15) {
    sharedConversations[channelId] = sharedConversations[channelId].slice(-15);
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: CATWOMAN_SYSTEM_PROMPT },
        ...sharedConversations[channelId],
      ],
      max_tokens: 100, // تم رفع القيمة لضمان عدم قطع الجمل والردود
      temperature: 0.6, 
    });

    let reply = completion.choices[0].message.content.trim();

    const emojiDictionary = {
      'CATWOMAN_smile': '<:CATWOMAN_smile:112233445566778899>', 
      'batman_laugh': '<:batman_laugh:998877665544332211>',
      'joker': '<:joker:554433221199887766>'
    };

    for (const [emojiName, emojiCode] of Object.entries(emojiDictionary)) {
      const regex = new RegExp(`\\[إيموجي:\\s*${emojiName}\\]`, 'gi');
      reply = reply.replace(regex, emojiCode);
    }

    // التنظيف المحسن لمنع حدوث النقاط الغريبة أو بتر أجزاء من الكلمات المجاورة
    reply = reply.replace(/\[الشخص:?\s*[^\]]*\]/g, '').trim();
    reply = reply.replace(/<@!?\d+>/g, '').replace(/@\w+/g, '').trim();
    reply = reply.replace(/^[.\s,、。/_|-]+/, '').trim(); // يمسح أي نقطة أو رمز ظهر في بداية الجملة بالخطأ
    
    sharedConversations[channelId].push({ role: 'assistant', content: reply });
    return reply;
  } catch (error) {
    console.error('Groq Error:', error);
    return 'أوه يا بات... هناك تشويش غريب في أجهزة الاتصال حالياً.';
  }
}

client.once('ready', () => { 
  console.log('Catwoman Bot Fix & Features Implemented Successfully! 🐾🔥'); 
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  let cleanContent = message.content.trim();

  // ===================== 🛑 قسم الأوامر التخريبية، الهجومية، والكوميدية =====================
  if (cleanContent.startsWith('كات ')) {
    const args = cleanContent.slice(4).trim().split(/ +/);
    const command = args[0];
    const targetUser = message.mentions.users.first();
    const targetMember = message.mentions.members.first();

    // 1. أمر فرض اسم عشوائي مضحك
    if (command === 'الاسم_العشوائي') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) {
        return message.reply("🐾 *تضحك بسخرية*.. تظن نفسك قادراً على توجيهي لتغيير أسماء لصوص غوثام؟");
      }
      if (!targetMember) return message.reply("🐾 منشن العضو لكي أمنحه اسماً يناسب حجمه الصغير؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 اسم سيدي بروس فوق كل الشبهات، لن ألمسه.");

      const chosenRandomName = RANDOM_FUNNY_NAMES[Math.floor(Math.random() * RANDOM_FUNNY_NAMES.length)];
      try {
        await targetMember.setNickname(chosenRandomName);
        return message.channel.send(`🎲 *تخلط كاتوومان الأوراق وتتسلل لتغيير هوية <@${targetUser.id}>!* \n🐾 "تم تغيير اسمه عشوائياً بنجاح إلى: **[ ${chosenRandomName} ]**.. هذا يناسبه تماماً اليوم!"`);
      } catch (err) {
        return message.reply("🚨 فشلت في تعديل اسمه، تأكد أن رتبة البوت أعلى من رتبة العضو المستهدف!");
      }
    }

    // 2. أمر ترجيع الاسم الأصلي
    if (command === 'ترجيع') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) {
        return message.reply("🐾 فقط أصحاب القصر يمكنهم أمري بإعادة الأسماء الأصليّة.");
      }
      if (!targetMember) return message.reply("🐾 منشن الشخص المسكين لإعادة اسمه الأصلي؟");

      try {
        await targetMember.setNickname(null);
        return message.channel.send(`✨ *تتنهد كاتوومان وتمسح علامات العبث من ملف <@${targetUser.id}>!* \n🐾 "تم إعادة اسمه الأصلي في الديسكورد بنجاح.. اذهب واشكر سيدي بروس على رحمته!"`);
      } catch (err) {
        return message.reply("🚨 تعذر إعادة اسمه، يرجى التحقق من رتبة وصلاحيات البوت.");
      }
    }

    // 3. أمر البخاخ (كوميدي)
    if (command === 'بخاخ') {
      if (!targetUser) return message.reply("🐾 من تريد مني أن أرشه بالماء؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 أرش سيدي بروس؟ لا أجرؤ.. بدلته غالية جداً! 🖤");
      return message.channel.send(`💦 *تُخرج كاتوومان بخاخ ماء صغير وترش وجه <@${targetUser.id}> عدة مرات!* \n🐾 "هش! ابتعد من هنا أيها المشاغب، اذهب وجفف نفسك بعيداً عني!"`);
    }

    // 4. أمر مكياج (كوميدي)
    if (command === 'مكياج') {
      if (!targetUser) return message.reply("🐾 من هو الضحية الذي سأجعله لوحتي الفنية؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 وجه باتمان مثالي كالعادة، لا يحتاج لأي مكياج.");
      return message.channel.send(`💄 *ترسم شوارب قطة وردية مستفزة على وجه <@${targetUser.id}> بأحمر الشفاه!* \n🐾 "واو! تبدو فاتناً ومضحكاً جداً الآن.. لا تغسل وجهك!" 😹`);
    }

    // 5. أمر كف (درامي)
    if (command === 'كف') {
      if (!targetUser) return message.reply("🐾 خد من يثير حكة يدي؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 أيدي خُلقت لتعانقك يا بات، وليس لضربك.");
      return message.channel.send(`👋 *تصفع <@${targetUser.id}> كافاً درامياً بقفازها الجلدي يجعله يدور حول نفسه!* \n🐾 "أوبس! هل كان وجهك في طريق يدي؟ اعتذاري الحار!" 😼`);
    }

    // 6. أمر تجاهل (إهانة مضحكة)
    if (command === 'تجاهل') {
      if (!targetUser) return message.reply("🐾 من الذي لا يستحق وقتي ثانية واحدة؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 أتجاهل العالم كله، لكن عيني لا تفارقك أبداً يا بات.");
      return message.channel.send(`🙄 *تستمع كاتوومان لكلام <@${targetUser.id}>، تتثاءب بملل، تدير ظهرها له وتبدأ بتنظيف أظافرها متجاهلة إياه كلياً.* \n🐾 "هل سمع أحدكم ذبابة تطن هنا؟ أم يتهيأ لي؟"`);
    }

    // 7. أمر التفتيش والسرقة
    if (command === 'تفتيش') {
      if (!targetUser) return message.reply("🐾 منشن الضحية التي تريد سرقة جواهرها؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 أسرق من حبيبي باتمان؟ جيوبي وجيوبك واحد يا سيدي.. 😉");
      
      const currentJems = catInventory[targetUser.id] || 0;
      if (currentJems <= 0) return message.reply(`🐾 *تفتش جيوبه بملل*.. هذا المسكين مفلس ولا يملك شيئاً لأسرقه!`);
      
      const stolenAmount = Math.floor(Math.random() * Math.min(currentJems, 15)) + 1;
      catInventory[targetUser.id] -= stolenAmount;
      catInventory[message.author.id] = (catInventory[message.author.id] || 0) + stolenAmount;
      return message.channel.send(`🕵️‍♀️ *تسرق من جيبه بخفة قطة محترفة!* \n🐾 "العملية تمت بسلاسة! سرقت منه **${stolenAmount} 💎 جوهرة** وحولتها لحسابنا!"`);
    }

    // 8. أمر إغلاق القناة (Lockdown)
    if (command === 'إغلاق') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) return message.reply("🐾 هذه الصلاحية مخصصة للمدراء فقط!");
      try {
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return message.channel.send(`🔒 *تقفز كاتوومان وتكسر لوحة الإرسال!* \n🐾 "تم إغلاق وتجميد القناة! اجلسوا واصمتوا حتى نسمح لكم بالكلام مجدداً."`);
      } catch (err) { return message.reply("🚨 لا أملك صلاحية (Manage Channels) لإغلاق هذه القناة!"); }
    }

    // 9. أمر مطلوب (Wanted)
    if (command === 'مطلوب') {
      if (!targetUser) return message.reply("🐾 منشن الشخص الملاحق؟");
      const bounty = args.slice(2).join(' ') || '10,000,000 $ مكافأة ميت أو حي!';
      return message.channel.send(`📢 🚨 **إعلان صادر عن قطة غوثام:** \n\n╔═════════════════════════╗\n  **WANTED / مطلوب للقبض عليه**\n  المجرم الملاحق: <@${targetUser.id}>\n  المكافأة: ${bounty}\n╚═════════════════════════╝\n🐾 "من يمسك به ويسلمه لي، له نسبة!"`);
    }

    // 10. أمر الخرش
    if (command === 'خرش') {
      if (!targetUser) return message.reply("🐾 حدد الشخص لمخالبي الحادة؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 مخالبي خلقت لأحميك يا بات.. 🖤");
      return message.channel.send(`🐈‍⬛ *تشهر مخالبها وتخرش وجه <@${targetUser.id}> خرشة ثلاثية حادة!* \n🐾 "إياك والعبث مع قطة غوثام مجدداً!"`);
    }

    // 11. أمر السجن بالرتبة
    if (command === 'سجن') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) return message.reply("🐾 ليس لديك صلاحية الأصفاد.");
      if (!targetMember) return message.reply("🐾 منشن السجين؟");
      const jailRole = message.guild.roles.cache.find(r => r.name === JAIL_ROLE_NAME);
      if (!jailRole) return message.reply(`🚨 لم أجد رتبة باسم **"${JAIL_ROLE_NAME}"**! قمم بإنشائها أولاً.`);
      try {
        await targetMember.roles.add(jailRole);
        return message.channel.send(`⛓️ *تغلق باب الزنزانة الحديدية وتضع الأصفاد في يد <@${targetUser.id}>!* \n🐾 "تم رمه في السجن برتبة **${JAIL_ROLE_NAME}**!"`);
      } catch (err) { return message.reply("🚨 فشلت عملية السجن، تحقق من ترتيب رتبة البوت."); }
    }

    // 12. أمر العض
    if (command === 'عض') {
      if (!targetUser) return message.reply("🐾 منشن الضحية لعضه؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 أكتفي بقبلة دلال وعشق 💋");
      return message.channel.send(`🐱 *تنقض فجأة على <@${targetUser.id}> وتعضه من كتفه بقوة!* \n🐾 "هذا جزاء من يقف في طريقي ويثر الضجة!"`);
    }

    // 13. أمر تأديب (Timeout دقيقة)
    if (command === 'تأديب') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) return message.reply("🐾 اذهب والعب بعيداً.");
      if (!targetMember) return message.reply("🐾 منشن العضو لإخراسه وتأديبه!");
      try {
        await targetMember.timeout(60000, "تأديب بطلب من الإدارة عبر كاتوومان");
        return message.channel.send(`🥊 *تضرب <@${targetUser.id}> بسوطها الجلدي ضربة خاطفة تخرسه لدقيقة!*`);
      } catch (err) { return message.reply("🚨 لا أملك صلاحية كافية للتايم أوت!"); }
    }
  }

  // ===================== نظام اللعبة الجماعية (سرقة) يعمل تلقائياً =====================
  if (cleanContent === 'سرقة') {
    if (gameState.isRoundActive) return message.reply("🐾 هناك اجتماع طوارئ قائم بالفعل، انتظر قليلاً!");
    gameState.isRoundActive = true; gameState.players = [message.author.id]; gameState.roles = {};
    const joinRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('join_game').setLabel('دخول قاعة الاجتماع 🕵️‍♂️').setStyle(ButtonStyle.Primary));
    const initialMessage = await message.channel.send({ content: `🐾 **اجتماع طوارئ يا لصوص غوثام!**\n👥 اللاعبون المسجلون حالياً: <@${message.author.id}>`, components: [joinRow] });
    const collector = initialMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
    collector.on('collect', async interaction => {
      if (interaction.customId === 'join_game') {
        if (gameState.players.includes(interaction.user.id)) return interaction.reply({ content: '🐾 متواجد بالفعل!', ephemeral: true });
        gameState.players.push(interaction.user.id); await interaction.reply({ content: '🔒 تم الدخول!', ephemeral: true });
        await initialMessage.edit({ content: `🐾 **اجتماع طوارئ يا لصوص غوثام!**\n👥 الحضور: ${gameState.players.map(p => `<@${p}>`).join(', ')}` });
      }
    });
    collector.on('end', async () => {
      await initialMessage.edit({ components: [] });
      if (gameState.players.length < 3) { gameState.isRoundActive = false; return message.channel.send("🚨 ألغيت لقلة الحضور."); }
      gameState.secretLocation = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
      gameState.detectiveId = gameState.players[Math.floor(Math.random() * gameState.players.length)];
      gameState.players.forEach(pId => gameState.roles[pId] = (pId === gameState.detectiveId) ? 'detective' : 'gang');
      const roleRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('reveal_role').setLabel('اضغط لمعرفة دورك 🔍').setStyle(ButtonStyle.Danger));
      const gameplayMsg = await message.channel.send({ content: `🔒 **أُغلقت الأبواب وتوزعت الأدوار سراً!** النقاش متاح لدقيقتين كعصابة.`, components: [roleRow] });
      const roleCollector = gameplayMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });
      roleCollector.on('collect', async bInt => {
        if (bInt.customId === 'reveal_role') {
          if (!gameState.players.includes(bInt.user.id)) return bInt.reply({ content: '❌ لست باللعبة.', ephemeral: true });
          await bInt.reply({ content: gameState.roles[bInt.user.id] === 'detective' ? `🕵️‍♂️ **أنت المحقق المتخفي!** لا تعرف المكان!` : `🥷 **أنت مخلص!** المكان: **「 ${gameState.secretLocation} 」**`, ephemeral: true });
        }
      });
      roleCollector.on('end', async () => {
        await gameplayMsg.edit({ components: [] });
        const voteRow = new ActionRowBuilder();
        gameState.players.forEach((pId, idx) => { if (idx < 5) voteRow.addComponents(new ButtonBuilder().setCustomId(`vote_${pId}`).setLabel(`صوّت ضد: ${message.guild.members.cache.get(pId)?.user.username || idx}`).setStyle(ButtonStyle.Secondary)); });
        const voteMsg = await message.channel.send({ content: `⏱️ حان وقت التصويت ضد الخائن!`, components: [voteRow] });
        const voteCounts = {}; gameState.players.forEach(id => voteCounts[id] = 0); const hasVoted = new Set();
        const voteCollector = voteMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });
        voteCollector.on('collect', async vInt => {
          if (!gameState.players.includes(vInt.user.id) || hasVoted.has(vInt.user.id)) return vInt.reply({ content: 'تعذر التصويت!', ephemeral: true });
          voteCounts[vInt.customId.replace('vote_', '')]++; hasVoted.add(vInt.user.id); await vInt.reply({ content: '🗳️ تم!', ephemeral: true });
        });
        voteCollector.on('end', async () => {
          await voteMsg.edit({ components: [] });
          let highest = gameState.players[0]; gameState.players.forEach(id => { if (voteCounts[id] > voteCounts[highest]) highest = id; });
          if (highest === gameState.detectiveId) {
            const locRow = new ActionRowBuilder();
            const options = [gameState.secretLocation, ...LOCATIONS.filter(l => l !== gameState.secretLocation).slice(0, 2)].sort();
            options.forEach((loc, idx) => locRow.addComponents(new ButtonBuilder().setCustomId(`guess_${idx}_${loc === gameState.secretLocation}`).setLabel(loc).setStyle(ButtonStyle.Success)));
            const gMsg = await message.channel.send({ content: `🚨 كشفتم المحقق <@${gameState.detectiveId}>! فرصة أخيرة له للتخمين بربح الطاولة..`, components: [locRow] });
            const gColl = gMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20000 });
            let correct = false;
            gColl.on('collect', async gInt => { if (gInt.user.id === gameState.detectiveId) { correct = gInt.customId.endsWith('true'); gColl.stop(); } });
            gColl.on('end', async () => {
              await gMsg.edit({ components: [] });
              if (correct) { await message.channel.send(`👑 قلب الطاولة وفاز المحقق وتعرف على المكان **「 ${gameState.secretLocation} 」**!`); }
              else { await message.channel.send(`🎉 فازت العصابة! فشل بتحديد المكان الصحيح وكان **「 ${gameState.secretLocation} 」**.`); }
              gameState.isRoundActive = false;
            });
          } else {
            await message.channel.send(`🃏 غباء! قتلتم بريئاً وفاز المحقق <@${gameState.detectiveId}> وتسلل بنجاح! المكان كان **「 ${gameState.secretLocation} 」**.`);
            gameState.isRoundActive = false;
          }
        });
      });
    });
    return;
  }

  // ===================== نظام شات الذكاء الاصطناعي والمحادثات =====================
  let mediaDescription = "";
  if (/https?:\/\/\S+/i.test(cleanContent)) {
    const urlMatch = cleanContent.match(/(https?:\/\/\S+)/i)[0];
    const urlWords = urlMatch.split(/[\/\-_.]/).filter(w => w.length > 3 && !['https', 'http', 'www', 'com', 'media', 'tenor', 'giphy'].includes(w.toLowerCase()));
    if (urlWords.length > 0) mediaDescription += ` [أرسل رابط ميديا/GIF يتعلق بـ: ${urlWords.slice(0, 2).join(' ')}]`;
  }
  if (message.attachments.size > 0) {
    const attachment = message.attachments.first();
    if (attachment.contentType && attachment.contentType.startsWith('image/')) mediaDescription += ` [أرسل صورة مرفقة باسم: ${attachment.name}]`;
  }

  cleanContent = cleanContent.replace(/<a?:(\w+):(\d+)>/g, '[إيموجي: $1]');
  let userMessage = (cleanContent + mediaDescription).trim().replace(`<@${client.user.id}>`, '').trim();

  const otherMention = message.mentions.users.find(u => u.id !== client.user.id);
  if (otherMention) userMessage = userMessage.replace(new RegExp(`<@!?${otherMention.id}>`, 'g'), `[الشخص: ${otherMention.username}]`).trim();

  const isMentioned = message.mentions.has(client.user);
  let isReplyToCatwoman = false;
  if (message.reference && message.reference.messageId) {
    try { const rMsg = await message.channel.messages.fetch(message.reference.messageId); if (rMsg.author.id === client.user.id) isReplyToCatwoman = true; } catch (e) {}
  }

  // تجاهل الرسائل التي لا تشير للبوت مباشرة إلا إذا ذكروا ألفرد
  if (!isMentioned && !isReplyToCatwoman) {
    if (message.mentions.users.some(u => u.username.toLowerCase().includes('alfred'))) {
      if ((cleanContent.includes('باتمان') || cleanContent.includes('بروس')) && Math.random() < 0.20) {
        await message.channel.sendTyping();
        setTimeout(async () => { await message.channel.send(message.author.id === OWNER_ID ? "أراك تتحدث مع ألفريد وتتجاهلني يا بات.. هل هناك سرّ تخفيه عني؟ 🐾" : `أرى أنكم تتحدثون عن عزيزي بات هنا.. ✨`); }, 2500);
      }
    }
    return;
  }

  if (!userMessage) return message.reply("🐾 *تطالعك بطرف عينها بصمت مريب*");
  await message.channel.sendTyping();
  try { if (message.author.id === OWNER_ID && Math.random() < 0.25) await message.react('💋'); } catch(e) {}

  setTimeout(async () => {
    let reply = await getCatwomanReply(message.channel.id, message.author.id, message.author.username, userMessage);
    message.reply(reply);
  }, Math.floor(Math.random() * 1000) + 1500);
});

client.on('guildMemberAdd', member => {
  catInventory[member.id] = 30; // منح كل عضو جديد 30 جوهر تلقائياً ليكون هدفاً للسرقة لاحقاً
});

client.login(process.env.DISCORD_TOKEN);
