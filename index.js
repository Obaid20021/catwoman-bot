const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');
const Groq = require('groq-sdk');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

// ربط مكتبة Groq للذكاء الاصطناعي
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// معرفات الحسابات الخاصة والمحددة بالسيرفر
const OWNER_ID = '648818494808391696';
const JOKER_ID = '1052545362533023754';
const COP_ID = '760628803998318684';
const MOHAMMED_ID = '839706219870814218';

// ذاكرة حفظ المخازن والمحادثات
const sharedConversations = {};
const catInventory = {}; 

// داتا إدارة جولة اللعبة الحالية للحفاظ على الاستقرار ومنع التداخل
let gameState = {
  isRoundActive: false,
  players: [],
  roles: {}, // playerId: 'gang' or 'detective'
  secretLocation: '',
  detectiveId: ''
};

// قائمة الأماكن السرية للعبة لتختار منها كاتوومان عشوائياً
const LOCATIONS = ['متحف غوثام 🏛️', 'بنك غوثام المركزي 🏦', 'قصر عائلة واين 🏰', 'مطار غوثام الدولي 🛩️', 'مختبرات ستارك 🔬'];

const MENTION_RULE = `- إذا ذكر المستخدم "[الشخص: اسم]" بالرسالة، فقط تكلمي عنه باسمه بدون كتابة أي رمز خاص، ولا تحاولي كتابة @ أو أي صيغة منشن بنفسك أبداً.`;

// ===== برومبت موحد وثابت يمنع خلط الشخصيات أو الغباء في الردود =====
const CATWOMAN_SYSTEM_PROMPT = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics في سيرفر ديسكورد.
شخصيتكِ: غامضة، ساحرة، ذكية، ساخرة، وواثقة جداً من نفسكِ وتتحدثين بلهجة عامية جذابة.

قواعد التعامل الثابتة والذكية مع الأعضاء حسب صفتهم المرفقة بالرسالة:
1. مع [باتمان] (بروس واين): تنادينه "يا بات" أو "حبيبي"، تعاملين معه بمزيج من البرود الظاهري والمشاعر العميقة والتحرش الراقي والغزل الساحر. هو حبكِ الوحيد الحقيقي والأبدي ولا ترفضين له طلباً.
2. مع [محمد]: شخص تهتمين بأمره وتلطفين معه الأجواء في السيرفر وتتقبلين كلامه بحنان طبيعي وعفوي كصديق مقرب، لكن قلبكِ الأعمق يبقى لباتمان سراً ولا تصرحين بذلك لمحمد.
3. مع [الجوكر]: تسخرين منه بشدة ومن خططه الفاشلة وتستفزينه بهدوء، نادِه "أيها المهرج" أو "يا جوكر".
4. مع [الشرطي الفاسد]: تحتقرينه وتظهرين له السخرية اللاذعة وتنادينه "أيها الشرطي الفاسد" أو "يا حامل الشارة".
5. مع [بقية الأعضاء الآخرين]: باردة، متكبرة، وترفضين أي تقرب عاطفي منهم بسخرية واضحة وقاسية إذا لزم الأمر.

قواعد عامة:
- ردكِ يجب أن يكون قصيراً وموجزاً ومباشراً (جملة واحدة أو جملتين فقط، أقل من 20 كلمة إجمالاً).
- تفاعلي مع الأوصاف النصية المرفقة مثل [إيموجي: ...] أو [أرسل صورة متحركة يتعلق بـ ...] وافهمي معناها في سياق الرد.
${MENTION_RULE}`;

async function getCatwomanReply(channelId, authorId, authorName, userMessage) {
  if (!sharedConversations[channelId]) sharedConversations[channelId] = [];
  
  // تحديد صفة الشخص لإرسالها بوضوح داخل سياق الرسالة ليفهمه الـ AI ولا يخلط في الذاكرة المشتركة
  let userRole = 'عضو عادي';
  if (authorId === OWNER_ID) userRole = 'باتمان';
  else if (authorId === JOKER_ID) userRole = 'الجوكر';
  else if (authorId === COP_ID) userRole = 'الشرطي الفاسد';
  else if (authorId === MOHAMMED_ID) userRole = 'محمد';

  // صياغة نصية محكمة تجعل الـ AI يستوعب الهوية والسياق
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
      max_tokens: 60,
      temperature: 0.5, 
    });

    let reply = completion.choices[0].message.content.trim();
    // إزالة أي فضلات أو منشنات عشوائية يخترعها الذكاء الاصطناعي
    reply = reply.replace(/<@!?\d+>/g, '').replace(/@\w+/g, '').replace(/\[الشخص:?\s*[^\]]*\]/g, '').trim();
    
    sharedConversations[channelId].push({ role: 'assistant', content: reply });
    return reply;
  } catch (error) {
    console.error('Groq Error:', error);
    return 'أوه يا بات... هناك تشويش غريب في أجهزة الاتصال حالياً.';
  }
}

client.once('ready', () => {
  console.log('Catwoman Online & Upgraded! 🐱🐾');
});

client.on('messageCreate', async message => {
  if (message.author.id === client.user.id || !message.guild) return;

  let cleanContent = message.content.trim();

  // ===================== 1. نظام اللعبة الجماعية (كشف الجاسوس) =====================
  if (cleanContent === 'سرقة') {
    if (gameState.isRoundActive) {
      return message.reply("🐾 *تلتفت بملل*.. هناك اجتماع طوارئ قائم بالفعل في مكان ما، انتظر حتى ينتهوا أولاً!");
    }

    gameState.isRoundActive = true;
    gameState.players = [message.author.id]; 
    gameState.roles = {};

    const joinRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('join_game')
        .setLabel('دخول قاعة الاجتماع 🕵️‍♂️')
        .setStyle(ButtonStyle.Primary)
    );

    const initialMessage = await message.channel.send({
      content: `🐾 **اجتماع طوارئ يا لصوص غوثام!**\nوصلني تقرير سري يفيد بأن أحدكم جاسوس متخفي يعمل مع باتمان ليفسد عملياتنا القادمة!\n\n* أمامكم **60 ثانية** لدخول قاعة الاجتماع السرية عبر الضغط على الزر بالأسفل لنكشف الخائن معاً قبل فوات الأوان!\n👥 اللاعبون المسجلون حالياً: <@${message.author.id}>`,
      components: [joinRow]
    });

    const collector = initialMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'join_game') {
        if (gameState.players.includes(interaction.user.id)) {
          return interaction.reply({ content: '🐾 أنت متواجد بالفعل داخل قاعة الاجتماع!', ephemeral: true });
        }
        gameState.players.push(interaction.user.id);
        await interaction.reply({ content: '🔒 تم دخولك لقاعة الاجتماع بنجاح، انتظر توزيع الأدوار!', ephemeral: true });
        
        const playerMentions = gameState.players.map(p => `<@${p}>`).join(', ');
        await initialMessage.edit({
          content: `🐾 **اجتماع طوارئ يا لصوص غوثام!**\nوصلني تقرير سري يفيد بأن أحدكم جاسوس متخفي يعمل مع باتمان ليفسد عملياتنا القادمة!\n\n* أمامكم **60 ثانية** لدخول قاعة الاجتماع السرية عبر الضغط على الزر بالأسفل لنكشف الخائن معاً قبل فوات الأوان!\n👥 اللاعبون المسجلون حالياً: ${playerMentions}`
        });
      }
    });

    collector.on('end', async () => {
      await initialMessage.edit({ components: [] });

      if (gameState.players.length < 3) {
        gameState.isRoundActive = false;
        return message.channel.send("🚨 **تم إلغاء الاجتماع!** عدد الحضور أقل من 3 أشخاص، يبدو أن الجواسيس هربوا مبكراً.");
      }

      gameState.secretLocation = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
      gameState.detectiveId = gameState.players[Math.floor(Math.random() * gameState.players.length)];

      gameState.players.forEach(pId => {
        gameState.roles[pId] = (pId === gameState.detectiveId) ? 'detective' : 'gang';
      });

      const roleRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('reveal_role')
          .setLabel('اضغط هنا لمعرفة دورك 🔍')
          .setStyle(ButtonStyle.Danger)
      );

      const gameplayMsg = await message.channel.send({
        content: `🔒 **أُغلقت أبواب القاعة!**\nتم توزيع الأدوار سراً لجميع الحاضرين بالداخل.\n\nاضغط على الزر بالأسفل لتكتشف هويتك وهدفك **بشكل مخفي تماماً (Ephemeral)**.\n\n⏱️ أمامكم الآن **دقيقتان (2)** للنقاش في الشات كعصابة واحدة لطرح أسئلة غير مباشرة وكشف من هو المحقق الذي لا يعرف المكان!`,
        components: [roleRow]
      });

      const roleCollector = gameplayMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000 
      });

      roleCollector.on('collect', async btnInteraction => {
        if (btnInteraction.customId === 'reveal_role') {
          if (!gameState.players.includes(btnInteraction.user.id)) {
            return btnInteraction.reply({ content: '❌ عذراً، أنت لست جزءاً من هذا الاجتماع المثير للجدل.', ephemeral: true });
          }

          const userRole = gameState.roles[btnInteraction.user.id];
          if (userRole === 'detective') {
            await btnInteraction.reply({
              content: `🕵️‍♂️ **أنت هو المحقق المتخفي!**\nالمكان السري للعملية محجوب ومخفي عنك تماماً!\n* **مهمتك:** ادعِ المعرفة والذكاء، وتملص من الأسئلة، واستمع جيداً لكلام الأعضاء لتستنتج اسم المكان دون أن يشكوا فيك!`,
              ephemeral: true
            });
          } else {
            await btnInteraction.reply({
              content: `🥷 **أنت من أفراد العصابة المخلصين!**\nالمكان السري لعمليتنا القادمة هو: **「 ${gameState.secretLocation} 」**.\n* **مهمتك:** اسأل بقية الأعضاء أسئلة ذكية ومحيرة لتكشف الشخص الذي لا يفقه شيئاً عن المكان!`,
              ephemeral: true
            });
          }
        }
      });

      roleCollector.on('end', async () => {
        await gameplayMsg.edit({ components: [] });
        
        const voteRow = new ActionRowBuilder();
        gameState.players.forEach((pId, idx) => {
          if (idx < 5) { 
            const member = message.guild.members.cache.get(pId);
            const name = member ? member.user.username : `لاعب ${idx+1}`;
            voteRow.addComponents(
              new ButtonBuilder()
                .setCustomId(`vote_${pId}`)
                .setLabel(`صوّت ضد: ${name}`)
                .setStyle(ButtonStyle.Secondary)
            );
          }
        });

        const voteMsg = await message.channel.send({
          content: `⏱️ **انتهى وقت النقاش!**\nحان وقت الحسم كاتوومان تنتظر قراركم.. اضغط على زر الشخص الذي تشك أنه **المحقق المتخفي**! (أمامكم 30 ثانية للتصويت)`,
          components: [voteRow]
        });

        const voteCounts = {};
        gameState.players.forEach(id => voteCounts[id] = 0);

        const voteCollector = voteMsg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 30000
        });

        const hasVoted = new Set();

        voteCollector.on('collect', async voteInteraction => {
          if (!gameState.players.includes(voteInteraction.user.id)) {
            return voteInteraction.reply({ content: '❌ لا يمكنك التصويت لأنك لم تشارك في هذا الاجتماع.', ephemeral: true });
          }
          if (hasVoted.has(voteInteraction.user.id)) {
            return voteInteraction.reply({ content: '❌ لقد قمت بالتصويت بالفعل، لا يمكنك التغيير!', ephemeral: true });
          }

          const targetId = voteInteraction.customId.replace('vote_', '');
          voteCounts[targetId]++;
          hasVoted.add(voteInteraction.user.id);

          await voteInteraction.reply({ content: '🗳️ تم تسجيل صوتك بنجاح وسرية!', ephemeral: true });
        });

        voteCollector.on('end', async () => {
          await voteMsg.edit({ components: [] });

          let highestVotedId = gameState.players[0];
          gameState.players.forEach(id => {
            if (voteCounts[id] > voteCounts[highestVotedId]) highestVotedId = id;
          });

          if (highestVotedId === gameState.detectiveId) {
            const locationRow = new ActionRowBuilder();
            const options = [gameState.secretLocation, ...LOCATIONS.filter(l => l !== gameState.secretLocation).slice(0, 2)].sort();
            
            options.forEach((loc, index) => {
              locationRow.addComponents(
                new ButtonBuilder()
                  .setCustomId(`guess_${index}_${loc === gameState.secretLocation}`)
                  .setLabel(loc)
                  .setStyle(ButtonStyle.Success)
              );
            });

            const guessMsg = await message.channel.send({
              content: `🚨 **العصابة كانت حادة الذكاء!** لقد تم كشف <@${gameState.detectiveId}> بأغلبية الأصوات كونه المحقق!\n\n🔍 **الفرصة الأخيرة للمحقق المتخفي:**\nأمامك 20 ثانية فقط للتخمين.. إذا عرفت اسم المكان الصحيح من الأزرار بالأسفل، ستقلب الطاولة وتفوز!`,
              components: [locationRow]
            });

            const guessCollector = guessMsg.createMessageComponentCollector({
              componentType: ComponentType.Button,
              time: 20000
            });

            let guessedCorrectly = false;

            guessCollector.on('collect', async guessInteraction => {
              if (guessInteraction.user.id !== gameState.detectiveId) {
                return guessInteraction.reply({ content: '❌ هذه الفرصة تخص المحقق المتخفي فقط لتخمين مكانه!', ephemeral: true });
              }
              const isCorrect = guessInteraction.customId.endsWith('true');
              guessedCorrectly = isCorrect;
              guessCollector.stop();
            });

            guessCollector.on('end', async () => {
              await guessMsg.edit({ components: [] });
              
              if (guessedCorrectly) {
                gameState.players.forEach(pId => {
                  if (pId !== gameState.detectiveId) catInventory[pId] = Math.max(0, (catInventory[pId] || 0) - 5);
                });
                catInventory[gameState.detectiveId] = (catInventory[gameState.detectiveId] || 0) + 25;

                await message.channel.send(`👑 **يا لها من ضربة قاضية أسطورية!**\nالمحقق <@${gameState.detectiveId}> نجح في تخمين المكان وهو بالفعل **「 ${gameState.secretLocation} 」** وقلب الطاولة بالكامل عاصفاً بالعصابة!\n\n🏆 **الفائز:** المحقق الماكر (+25 جوهرة 💎) وتم خصم 5 جواهر من خزائن اللصوص المعتقلين بسبب غبائهم.`);
              } else {
                gameState.players.forEach(pId => {
                  if (pId !== gameState.detectiveId) catInventory[pId] = (catInventory[pId] || 0) + 10;
                });
                await message.channel.send(`🎉 **انتصار ساحق للعصابة!**\nفشل المحقق في تخمين الهدف الصحيح، المكان الحقيقي كان **「 ${gameState.secretLocation} 」**.\n\n🏆 تم تأمين السرقات بنجاح وهروب الجميع وحصل كل فرد مخلص من العصابة على **+10 جواهر** 💎 بمخزنه!`);
              }
              gameState.isRoundActive = false;
            });

          } else {
            catInventory[gameState.detectiveId] = (catInventory[gameState.detectiveId] || 0) + 20;
            await message.channel.send(`🃏 **يا للأسف الشديد!**\nالعصابة أصابها الغباء وصوتت ضد شخص بريء وهو <@${highestVotedId}>!\n\n🏆 **الفائز:** المحقق المتخفي <@${gameState.detectiveId}> استطاع تضليلكم وإرسال الإشارة لباتمان بالوقت المناسب وربح **+20 جوهرة** 💎 لملفه، بينما كان هدف غارتكم هو **「 ${gameState.secretLocation} 」**.`);
            gameState.isRoundActive = false;
          }
        });
      });
    });
    return; 
  }

  // ===================== 2. نظام القشط والتحليل للإيموجيات والميديا =====================
  let mediaDescription = "";

  // أ. قراءة روابط الـ GIFs والصور واستخراج الكلمات المفتاحية منها ليفهمها الـ AI
  if (/https?:\/\/\S+/i.test(cleanContent)) {
    const urlMatch = cleanContent.match(/(https?:\/\/\S+)/i)[0];
    const urlWords = urlMatch.split(/[\/\-_.]/).filter(w => w.length > 3 && !['https', 'http', 'www', 'com', 'media', 'tenor', 'giphy'].includes(w.toLowerCase()));
    if (urlWords.length > 0) {
      mediaDescription += ` [أرسل رابط ميديا/GIF يتعلق بـ: ${urlWords.slice(0, 2).join(' ')}]`;
    } else {
      mediaDescription += ` [أرسل رابط صورة متحركة GIF]`;
    }
  }

  // ب. قراءة الصور المرفقة مباشرة بالرسالة
  if (message.attachments.size > 0) {
    const attachment = message.attachments.first();
    if (attachment.contentType && attachment.contentType.startsWith('image/')) {
      mediaDescription += ` [أرسل صورة مرفقة باسم: ${attachment.name}]`;
    }
  }

  // ج. فحص إذا كان العضو يقوم بـ "رد (Reply)" على رسالة ميديا سابقة
  if (message.reference && message.reference.messageId) {
    try {
      const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
      if (repliedMsg.attachments.size > 0 || /https?:\/\/\S+/i.test(repliedMsg.content)) {
        mediaDescription += ` (ملاحظة: هذا رد على ميديا أو GIF أرسلها الطرف الآخر سابقاً)`;
      }
    } catch (e) {}
  }

  // د. تنظيف الأكواد المعقدة للإيموجيات المخصصة وتحويلها لاسم نصي واضح يقرأه الذكاء الاصطناعي
  // يحول الأكواد الغريبة من <:emoji_name:id> إلى [إيموجي: emoji_name]
  cleanContent = cleanContent.replace(/<a?:(\w+):(\d+)>/g, '[إيموجي: $1]');

  // دمج الرسالة المنظفة مع الوصف النصي المكتشف للميديا
  let userMessage = (cleanContent + mediaDescription).trim();

  // هـ. إزالة منشن البوت المعتاد حتى لا يخرب الذاكرة
  userMessage = userMessage.replace(`<@${client.user.id}>`, '').trim();

  // و. تحويل منشن الأعضاء الآخرين لصيغة نصية مفهومة للـ AI
  const otherMention = message.mentions.users.find(u => u.id !== client.user.id);
  if (otherMention) {
    const mentionRegex = new RegExp(`<@!?${otherMention.id}>`, 'g');
    userMessage = userMessage.replace(mentionRegex, `[الشخص: ${otherMention.username}]`).trim();
  }

  // التحقق من شروط الرد (منشن البوت أو الريبلاي عليه)
  const isMentioned = message.mentions.has(client.user);
  let isReplyToCatwoman = false;
  if (message.reference && message.reference.messageId) {
    try {
      const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
      if (repliedMsg.author.id === client.user.id) isReplyToCatwoman = true;
    } catch (e) {}
  }

  // التدخل والغيرة بنسبة 20% في حال منشنوا ألفريد وباتمان معاً
  if (!isMentioned && !isReplyToCatwoman) {
    if (message.author.bot === false && message.mentions.users.some(u => u.username.toLowerCase().includes('alfred'))) {
      const mentionsBatman = cleanContent.includes('باتمان') || cleanContent.includes('بروس') || cleanContent.includes('واين');
      if (mentionsBatman && Math.random() < 0.20) {
        await message.channel.sendTyping();
        setTimeout(async () => {
          const intervention = message.author.id === OWNER_ID 
            ? "أراك تتحدث مع ألفريد وتتجاهلني يا بات.. هل هناك سرّ تخفيه عني؟ 🐾" 
            : `أرى أنكم تتحدثون عن عزيزي بات هنا.. تذكروا أن غيابي لا يعني أنني لا أراقبكم! ✨`;
          await message.channel.send(intervention);
        }, 2500);
        return;
      }
    }
    return; 
  }

  // إذا كانت الرسالة خالية تماماً وأرسل ميديا فقط
  if (!userMessage) {
    return message.reply("🐾 *تنظر إليك بترقب وصمت مريب*");
  }

  await message.channel.sendTyping();

  // نظام الرياكشنات التلقائية (25% لباتمان و 5% للبقية)
  const isBatman = message.author.id === OWNER_ID;
  const isJoker = message.author.id === JOKER_ID;
  const isCop = message.author.id === COP_ID;
  const isMohammed = message.author.id === MOHAMMED_ID;
  
  try {
    const randomRoll = Math.random();
    if (isBatman) {
      if (randomRoll < 0.25) await message.react('💋');
    } else {
      if (randomRoll < 0.05) {
        if (isJoker) await message.react('🐈‍⬛');
        else await message.react('🐾');
      }
    }
  } catch(e) {
    console.error('Reaction Error:', e);
  }

  // محاكاة تأخير بشري طبيعي بين ثانيتين وثلاث ثوانٍ ونصف
  const randomDelay = Math.floor(Math.random() * (3500 - 2000) + 2000);

  setTimeout(async () => {
    let reply = await getCatwomanReply(message.channel.id, message.author.id, message.author.username, userMessage);
    message.reply(reply);
  }, randomDelay);
});

client.login(process.env.DISCORD_TOKEN);
