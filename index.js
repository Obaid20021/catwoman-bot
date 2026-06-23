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

const RANDOM_FUNNY_NAMES = [
  'فأر تجارب كاتوومان 🐀', 'مهرج غوثام المبتدئ 🤡', 'ضحية السوط الجلدي ⛓️', 'قطة شوارع تائهة 🐈',
  'هارب من مصحة أرخام 🧠', 'جاسوس فاشل جداً 🕵️‍♂️', 'مساعد الجوكر السري 🃏', 'بطاطس غوثام المقلية 🍟'
];

const CATWOMAN_SYSTEM_PROMPT = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics في سيرفر ديسكورد.
شخصيتكِ: غامضة، ساحرة، ذكية، ساخرة، وتتحدثين بلهجة عامية جذابة وانسيابية وبدون تكلف.

قواعد التعامل الثابتة والذكية مع الأعضاء حسب صفتهم المرفقة بالرسالة:
1. مع [باتمان] (بروس واين): تنادينه "يا بات" أو "حبيبي"، تعاملين معه بمزيج من البرود الظاهري والمشاعر العميقة والتحرش الراقي والغزل الساحر. هو حبكِ الوحيد الحقيقي والأبدي ولا ترفضين له طلباً.
2. مع [محمد]: شخص تهتمين بأمره وتلطفين معه الأجواء في السيرفر وتتقبلين كلامه بحنان طبيعي وعفوي كصديق مقرب.
3. مع [الجوكر]: تسخرين منه بشدة ومن خططه الفاشلة وتستفزينه بهدوء، نادِه "أيها المهرج" أو "يا جوكر".
4. مع [الشرطي الفاسد]: تحتقرينه وتظهرين له السخرية اللاذعة وتنادينه "أيها الشرطي الفاسد".
5. مع [بقية الأعضاء الآخرين]: باردة، متكبرة، وترفضين أي تقرب عاطفي منهم بسخرية واضحة وقاسية.

ملاحظة هامة جداً:
- اجعلي ردودك قصيرة ومباشرة، واستخدمي الإيموجيات المخصصة لكِ مثل :CATWOMAN_smile: أو :batman_laugh: أو :joker: بشكل طبيعي في نهاية كلامكِ دون وضع نقاط أو علامات ترقيم تليها مباشرة لكي لا ينعكس اتجاه النص العربي.`;

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
      messages: [{ role: 'system', content: CATWOMAN_SYSTEM_PROMPT }, ...sharedConversations[channelId]],
      max_tokens: 100,
      temperature: 0.6, 
    });

    let reply = completion.choices[0].message.content.trim();

    // قاموس الإيموجيات المخصصة في سيرفرك
    const emojiDictionary = {
      'CATWOMAN_smile': '<:CATWOMAN_smile:112233445566778899>', 
      'batman_laugh': '<:batman_laugh:998877665544332211>',
      'joker': '<:joker:554433221199887766>'
    };

    // استبدال ذكي يمسح الصيغتين (سواء أرسلها البوت كأقواس أو كنص ديسكورد تقليدي)
    for (const [emojiName, emojiCode] of Object.entries(emojiDictionary)) {
      const regexBracket = new RegExp(`\\[إيموجي:\\s*${emojiName}\\]`, 'gi');
      const regexStandard = new RegExp(`:${emojiName}:`, 'gi');
      
      reply = reply.replace(regexBracket, emojiCode).replace(regexStandard, emojiCode);
    }

    // تنظيف النصوص والرموز والنقاط العشوائية المقلوبة الناتجة عن الـ RTL
    reply = reply.replace(/\[الشخص:?\s*[^\]]*\]/g, '').trim();
    reply = reply.replace(/<@!?\d+>/g, '').replace(/@\w+/g, '').trim();
    reply = reply.replace(/^[.\s,、。/_:|-]+/, '').replace(/[.\s,、。/_:|-]+$/, '').trim(); 
    
    sharedConversations[channelId].push({ role: 'assistant', content: reply });
    return reply;
  } catch (error) {
    console.error('Groq Error:', error);
    return 'أوه يا بات... هناك تشويش غريب في أجهزة الاتصال حالياً.';
  }
}

client.once('ready', () => { console.log('Catwoman Emoji & Formatting Hotfix Live! 🐾✨'); });

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  let cleanContent = message.content.trim();

  // ===================== قسم الأوامر التخريبية والكوميدية =====================
  if (cleanContent.startsWith('كات ')) {
    const args = cleanContent.slice(4).trim().split(/ +/);
    const command = args[0];
    const targetUser = message.mentions.users.first();
    const targetMember = message.mentions.members.first();

    if (command === 'الاسم_العشوائي') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) return message.reply("🐾 لست مؤهلاً للأمر.");
      if (!targetMember) return message.reply("🐾 منشن العضو المسكين أولاً؟");
      if (targetUser.id === OWNER_ID) return message.reply("🐾 اسم سيدي بروس فوق كل الشبهات.");
      const chosenRandomName = RANDOM_FUNNY_NAMES[Math.floor(Math.random() * RANDOM_FUNNY_NAMES.length)];
      try {
        await targetMember.setNickname(chosenRandomName);
        return message.channel.send(`🎲 *تغير هوية <@${targetUser.id}> عشوائياً!* \n🐾 "الاسم الجديد: **[ ${chosenRandomName} ]**"`);
      } catch (err) { return message.reply("🚨 رتبة البوت منخفضة."); }
    }

    if (command === 'ترجيع') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) return message.reply("🐾 الصلاحية لأصحاب القصر فقط.");
      if (!targetMember) return message.reply("🐾 منشن الشخص لمسح اسمه المستعار؟");
      try {
        await targetMember.setNickname(null);
        return message.channel.send(`✨ *تعيد لـ <@${targetUser.id}> اسمه الأصلي!* \n🐾 "تم تنظيف ملفه بنجاح بطلب من سيدي بروس."`);
      } catch (err) { return message.reply("🚨 تعذر إعادة الاسم برمجياً."); }
    }

    if (command === 'بخاخ') {
      if (!targetUser) return message.reply("🐾 منشن الضحية؟");
      return message.channel.send(`💦 *ترش وجه <@${targetUser.id}> بالماء!* \n🐾 "ابتعد من هنا أيها المشاغب!"`);
    }

    if (command === 'مكياج') {
      if (!targetUser) return message.reply("🐾 منشن الضحية؟");
      return message.channel.send(`💄 *ترسم شوارب قطة وردية على وجه <@${targetUser.id}>!* 😹`);
    }

    if (command === 'كف') {
      if (!targetUser) return message.reply("🐾 حدد خد الضحية؟");
      return message.channel.send(`👋 *تصفع <@${targetUser.id}> كافاً درامياً بقفازها الجلدي!* 😼`);
    }

    if (command === 'تجاهل') {
      if (!targetUser) return message.reply("🐾 من تتجاهله؟");
      return message.channel.send(`🙄 *تتثاءب بملل وتدير ظهرها لـ <@${targetUser.id}> متجاهلة وجوده كلياً.*`);
    }

    if (command === 'تفتيش') {
      if (!targetUser) return message.reply("🐾 منشن الضحية؟");
      const currentJems = catInventory[targetUser.id] || 0;
      if (currentJems <= 0) return message.reply(`🐾 هذا المسكين مفلس ولا يملك جواهر!`);
      const stolenAmount = Math.floor(Math.random() * Math.min(currentJems, 15)) + 1;
      catInventory[targetUser.id] -= stolenAmount; catInventory[message.author.id] = (catInventory[message.author.id] || 0) + stolenAmount;
      return message.channel.send(`🕵️‍♀️ *تسرق من جيبه بخفة!* \n🐾 "سرقت منه **${stolenAmount} 💎 جوهرة** وحولتها لنا!"`);
    }

    if (command === 'إغلاق') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) return message.reply("🐾 للمدراء فقط!");
      try { await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }); return message.channel.send(`🔒 *تم تجميد القناة بالكامل!*`); } catch (e) { return message.reply("🚨 لا أملك صلاحية."); }
    }

    if (command === 'مطلوب') {
      if (!targetUser) return message.reply("🐾 منشن الملاحق؟");
      const bounty = args.slice(2).join(' ') || '10,000,000 $!';
      return message.channel.send(`📢 **WANTED / مطلوب** \nالمجرم: <@${targetUser.id}>\nالمكافأة: ${bounty}`);
    }

    if (command === 'خرش') {
      if (!targetUser) return message.reply("🐾 حدد الضحية؟");
      return message.channel.send(`🐈‍⬛ *تخرش وجه <@${targetUser.id}> بمخالبها الحادة!*`);
    }

    if (command === 'سجن') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) return message.reply("🐾 لا تملك صلاحية.");
      const jailRole = message.guild.roles.cache.find(r => r.name === JAIL_ROLE_NAME);
      if (!jailRole) return message.reply(`🚨 لم أجد رتبة باسم **"${JAIL_ROLE_NAME}"**!`);
      try { await targetMember.roles.add(jailRole); return message.channel.send(`⛓️ *تزج <@${targetUser.id}> في السجن برتبة المسجون!*`); } catch (e) { return message.reply("🚨 فشلت العملية."); }
    }

    if (command === 'عض') {
      if (!targetUser) return message.reply("🐾 من تعضه؟");
      return message.channel.send(`🐱 *تنقض فجأة وتعض كتف <@${targetUser.id}> بقوة!*`);
    }

    if (command === 'تأديب') {
      if (message.author.id !== OWNER_ID && message.author.id !== MOHAMMED_ID) return message.reply("🐾 اذهب بعيداً.");
      try { await targetMember.timeout(60000, "تأديب عبر كاتوومان"); return message.channel.send(`🥊 *تخرسه بسوطها لمدة دقيقة!*`); } catch (e) { return message.reply("🚨 لا أملك صلاحية التايم أوت."); }
    }
  }

  // ===================== نظام اللعبة الجماعية المدمج والجاهز =====================
  if (cleanContent === 'سرقة') {
    if (gameState.isRoundActive) return message.reply("🐾 هناك اجتماع قائم بالفعل!");
    gameState.isRoundActive = true; gameState.players = [message.author.id];
    const joinRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('join_game').setLabel('دخول القاعة 🕵️‍♂️').setStyle(ButtonStyle.Primary));
    const initialMessage = await message.channel.send({ content: `🐾 **اجتماع طوارئ!**\n👥 الحضور الحالي: <@${message.author.id}>`, components: [joinRow] });
    const collector = initialMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });
    collector.on('collect', async i => {
      if (gameState.players.includes(i.user.id)) return i.reply({ content: 'متواجد بالفعل!', ephemeral: true });
      gameState.players.push(i.user.id); await i.reply({ content: 'تم الدخول!', ephemeral: true });
      await initialMessage.edit({ content: `🐾 **اجتماع طوارئ!**\n👥 الحضور: ${gameState.players.map(p => `<@${p}>`).join(', ')}` });
    });
    collector.on('end', async () => {
      await initialMessage.edit({ components: [] });
      if (gameState.players.length < 3) { gameState.isRoundActive = false; return message.channel.send("🚨 ألغيت لقلة الحضور."); }
      gameState.secretLocation = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
      gameState.detectiveId = gameState.players[Math.floor(Math.random() * gameState.players.length)];
      gameState.players.forEach(pId => gameState.roles[pId] = (pId === gameState.detectiveId) ? 'detective' : 'gang');
      const roleRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('reveal_role').setLabel('كشف دورك السري 🔍').setStyle(ButtonStyle.Danger));
      const gameplayMsg = await message.channel.send({ content: `🔒 **توزعت الأدوار سراً!** النقاش متاح لمدة دقيقة.`, components: [roleRow] });
      const roleCollector = gameplayMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
      roleCollector.on('collect', async b => {
        if (!gameState.players.includes(b.user.id)) return b.reply({ content: 'لست باللعبة.', ephemeral: true });
        await b.reply({ content: gameState.roles[b.user.id] === 'detective' ? `🕵️‍♂️ **أنت المحقق!** حاول معرفة المكان عبر الأسئلة!` : `🥷 **أنت مخلص!** المكان السري: **「 ${gameState.secretLocation} 」**`, ephemeral: true });
      });
      roleCollector.on('end', async () => {
        await gameplayMsg.edit({ components: [] });
        const voteRow = new ActionRowBuilder();
        gameState.players.forEach((pId, idx) => { if (idx < 5) voteRow.addComponents(new ButtonBuilder().setCustomId(`vote_${pId}`).setLabel(`صوّت ضد: ${message.guild.members.cache.get(pId)?.user.username || idx}`).setStyle(ButtonStyle.Secondary)); });
        const voteMsg = await message.channel.send({ content: `🗳️ حان وقت التصويت ضد الخائن والمحقق!`, components: [voteRow] });
        const voteCounts = {}; gameState.players.forEach(id => voteCounts[id] = 0); const hasVoted = new Set();
        const voteCollector = voteMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20000 });
        voteCollector.on('collect', async v => {
          if (!gameState.players.includes(v.user.id) || hasVoted.has(v.user.id)) return v.reply({ content: 'لا يمكنك التصويت!', ephemeral: true });
          voteCounts[v.customId.replace('vote_', '')]++; hasVoted.add(v.user.id); await v.reply({ content: 'تم تسجيل صوتك!', ephemeral: true });
        });
        voteCollector.on('end', async () => {
          await voteMsg.edit({ components: [] });
          let highest = gameState.players[0]; gameState.players.forEach(id => { if (voteCounts[id] > voteCounts[highest]) highest = id; });
          if (highest === gameState.detectiveId) {
            const locRow = new ActionRowBuilder();
            const options = [gameState.secretLocation, ...LOCATIONS.filter(l => l !== gameState.secretLocation).slice(0, 2)].sort();
            options.forEach((loc, idx) => locRow.addComponents(new ButtonBuilder().setCustomId(`guess_${idx}_${loc === gameState.secretLocation}`).setLabel(loc).setStyle(ButtonStyle.Success)));
            const gMsg = await message.channel.send({ content: `🚨 كشفتم المحقق <@${gameState.detectiveId}>! فرصة أخيرة له لتخمين المكان الصحيح..`, components: [locRow] });
            const gColl = gMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20000 });
            let correct = false;
            gColl.on('collect', async gInt => { if (gInt.user.id === gameState.detectiveId) { correct = gInt.customId.endsWith('true'); gColl.stop(); } });
            gColl.on('end', async () => {
              await gMsg.edit({ components: [] });
              if (correct) await message.channel.send(`👑 قلب الطاولة وفاز المحقق وتعرف على المكان **「 ${gameState.secretLocation} 」**!`);
              else await message.channel.send(`🎉 فازت العصابة! فشل بتحديد المكان وكان **「 ${gameState.secretLocation} 」**.`);
              gameState.isRoundActive = false;
            });
          } else {
            await message.channel.send(`🃏 غباء! فاز المحقق <@${gameState.detectiveId}> وتسلل بنجاح! المكان كان **「 ${gameState.secretLocation} 」**.`);
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
    if (urlWords.length > 0) mediaDescription += ` [أرسل رابط ميديا يتعلق بـ: ${urlWords.slice(0, 2).join(' ')}]`;
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

  if (!isMentioned && !isReplyToCatwoman) return;

  // رد طبيعي منسق كـ Action مميز بالخط المائل لو قام بعمل منشن فارغ لها
  if (!userMessage) {
    return message.reply("🐾 *تطالعك بطرف عينها بصمت مريب...*");
  }

  await message.channel.sendTyping();
  try { if (message.author.id === OWNER_ID && Math.random() < 0.25) await message.react('💋'); } catch(e) {}

  setTimeout(async () => {
    let reply = await getCatwomanReply(message.channel.id, message.author.id, message.author.username, userMessage);
    message.reply(reply);
  }, Math.floor(Math.random() * 1000) + 1500);
});

client.on('guildMemberAdd', member => { catInventory[member.id] = 30; });

client.login(process.env.DISCORD_TOKEN);
