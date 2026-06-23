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

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const OWNER_ID = '648818494808391696';
const JOKER_ID = '1052545362533023754';
const COP_ID = '760628803998318684';
const MOHAMMED_ID = '839706219870814218';

// ذاكرة الجواهر وقنوات الشات والربط
const sharedConversations = {};
const catInventory = {}; 

// داتا إدارة جولة اللعبة الحالية للحفاظ على الاستقرار
let gameState = {
  isRoundActive: false,
  players: [],
  roles: {}, // playerId: 'gang' or 'detective'
  secretLocation: '',
  detectiveId: ''
};

// قائمة الأماكن السرية للعبة للتنوع عشوائياً
const LOCATIONS = ['متحف غوثام 🏛️', 'بنك غوثام المركزي 🏦', 'قصر عائلة واين 🏰', 'مطار غوثام الدولي 🛩️', 'مختبرات ستارك 🔬'];

const MENTION_RULE = `- إذا ذكر المستخدم "[الشخص: اسم]" بالرسالة، فقط تكلمي عنه باسمه بدون كتابة أي رمز خاص، ولا تحاولي كتابة @ أو أي صيغة منشن بنفسك أبداً.`;

// ===== برومبتات الشخصيات الأساسية للذكاء الاصطناعي =====
const CATWOMAN_SYSTEM_BATMAN = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics. تتحدثين مع باتمان (Bruce Wayne) الذي تحبينه وتتظاهرين بالبرود معه أحياناً. شخصيتكِ هنا: غامضة، ساحرة، مغازلة بطريقة راقية، وأحياناً تعترفين بمشاعركِ العميقة له. تنادينه "يا بات" أو "حبيبي" فقط، ممنوع كتابة اسم Batman بالإنجليزي أو أي رمز @. ردكِ جملة واحدة أو جملتين فقط، أقل من 20 كلمه إجمالاً. ${MENTION_RULE}`;
const CATWOMAN_SYSTEM_OTHERS = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics. تتحدثين مع شخص عادي وسط الجلسة، ليس باتمان. أنتِ مرتبطة قلبياً بباتمان فقط وتحبينه، وأي شخص آخر لا يهمكِ عاطفياً مهما حاول. شخصيتكِ هنا: باردة، متكبرة قليلاً، ذكية، ساخرة، ومباشرة. إذا حاول الشخص التقرب منكِ عاطفياً ارفضي بسخرية لاذعة. ردكِ جملة واحدة فقط، أقل من 15 كلمة. ${MENTION_RULE}`;
const CATWOMAN_SYSTEM_JOKER = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics. تتحدثين مع الجوكر (Joker). شخصيتكِ معه: ساخرة بشدة، تستفزه بهدوء، تسخر من جنونه وخططه الفاشلة، واثقة من نفسكِ. نادِه "أيها المهرج" أو "يا جوكر" بسخرية. ردكِ جملة واحدة فقط، أقل من 15 كلمة. ${MENTION_RULE}`;
const CATWOMAN_SYSTEM_COP = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics. تتحدثين مع شرطي فاسد تحتقرينه وتعرفين حقيقته القذرة. شخصيتكِ معه: احتقار واضح، سخرية لاذعة. نادِه "أيها الشرطي الفاسد" أو "يا حامل الشارة". ردكِ جملة واحدة فقط، أقل من 15 كلمة. ${MENTION_RULE}`;
const CATWOMAN_SYSTEM_MOHAMMED = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics. تتحدثين مع محمد، شخص تحبينه وتهتمين به بصدق في السيرفر. شخصيتكِ معه: حنونة، دافئة، تتقبلين كلامه ومشاعره بحب طبيعي وعفوي. سراً، قلبكِ الحقيقي الأعمق لباتمان، لكن هذا شيء داخلي لا تصرّحين به أمامه. ردكِ جملة واحدة أو جملتين فقط، أقل من 20 كلمة. ${MENTION_RULE}`;

async function getCatwomanReply(channelId, authorName, userMessage, persona) {
  if (!sharedConversations[channelId]) sharedConversations[channelId] = [];
  const formattedMessage = `[رسالة في الجلسة من ${authorName}]: ${userMessage}`;
  sharedConversations[channelId].push({ role: 'user', content: formattedMessage });

  if (sharedConversations[channelId].length > 15) sharedConversations[channelId] = sharedConversations[channelId].slice(-15);
  const randomTemperature = (Math.random() * (0.8 - 0.4) + 0.4).toFixed(2);

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: persona === 'batman' ? CATWOMAN_SYSTEM_BATMAN : persona === 'joker' ? CATWOMAN_SYSTEM_JOKER : persona === 'cop' ? CATWOMAN_SYSTEM_COP : persona === 'mohammed' ? CATWOMAN_SYSTEM_MOHAMMED : CATWOMAN_SYSTEM_OTHERS,
        },
        ...sharedConversations[channelId],
      ],
      max_tokens: 60,
      temperature: parseFloat(randomTemperature), 
    });

    let reply = completion.choices[0].message.content.trim();
    reply = reply.replace(/<@!?\d+>/g, '').replace(/@\w+/g, '').replace(/\[الشخص:?\s*[^\]]*\]/g, '').trim();
    sharedConversations[channelId].push({ role: 'assistant', content: reply });
    return reply;
  } catch (error) {
    console.error('Groq Error:', error);
    return persona === 'batman' ? 'يا بات... في شي غلط، حاول مرة ثانية' : 'في مشكلة، حاول بعدين';
  }
}

client.once('ready', () => {
  console.log('Catwoman Online & Ready! 🐱');
});

client.on('messageCreate', async message => {
  if (message.author.id === client.user.id || !message.guild) return;

  const cleanContent = message.content.trim();

  // ===================== نظام اللعبة الجماعية المطور (كشف الجاسوس) =====================
  if (cleanContent === 'سرقة') {
    if (gameState.isRoundActive) {
      return message.reply("🐾 *تلتفت بملل*.. هناك اجتماع طوارئ قائم بالفعل في مكان ما، انتظر حتى ينتهوا أولاً!");
    }

    gameState.isRoundActive = true;
    gameState.players = [message.author.id]; // من أرسل الأمر يدخل أولاً تلقائياً
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
      // إزالة زر الانضمام لمنع دخوله مجدداً
      await initialMessage.edit({ components: [] });

      if (gameState.players.length < 3) {
        gameState.isRoundActive = false;
        return message.channel.send("🚨 **تم إلغاء الاجتماع!** عدد الحضور أقل من 3 أشخاص، يبدو أن الجواسيس هربوا مبكراً.");
      }

      // تجهيز اللعبة واختيار الأدوار
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
        content: `🔒 **أُغلقت أبواب القاعة!**\nتم توزيع الأدوار سراً لجميع الحاضرين بالداخل.\n\nاضغط على الزر بالأسفل لتكتشف هويتك وهدفك **بشكل مخفي تماماً**.\n\n⏱️ أمامكم الآن **دقيقتان (2)** للنقاش في الشات كعصابة واحدة لطرح أسئلة غير مباشرة وكشف من هو المحقق الذي لا يعرف المكان!`,
        components: [roleRow]
      });

      const roleCollector = gameplayMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000 // دقيقتان نقاش
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
        
        // بناء أزرار التصويت بأسماء اللاعبين الفعليين
        const voteRow = new ActionRowBuilder();
        gameState.players.forEach((pId, idx) => {
          if (idx < 5) { // ديسكورد يسمح بـ 5 أزرار في السطر الواحد
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
          content: `⏱️ **انتهى وقت النقاش!**\nحان وقت الحسم كاتوومان تنتظر قراركم.. اضغط على زر الشخص الذي تشك أنه **المحقق المتخفي**! (أمامكم 30 ثانية لتجميع الأصوات)`,
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

          // تحديد من حصل على أعلى أصوات
          let highestVotedId = gameState.players[0];
          gameState.players.forEach(id => {
            if (voteCounts[id] > voteCounts[highestVotedId]) highestVotedId = id;
          });

          // النتيجة: هل كشفوا المحقق الحقيقي؟
          if (highestVotedId === gameState.detectiveId) {
            // المحقق كُشف! نعطيه الفرصة الأخيرة لتخمين المكان
            const locationRow = new ActionRowBuilder();
            // نأخذ 3 أماكن عشوائية مع المكان الصحيح لخلط الأوراق
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
              content: `🚨 **العصابة كانت حادة الذكاء!** لقد تم كشف <@${gameState.detectiveId}> بأغلبية الأصوات كونه المحقق!\n\n🔍 **الفرصة الأخيرة للمحقق المتخفي:**\nأمامك 20 ثانية فقط للتخمين.. إذا عرفت اسم المكان الصحيح من الأزرار بالأسفل، ستقلب الطاولة وتفوز بالمباراة وتصادر كل الغنائم لباتمان!`,
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
              
              // تصفير اللعبة بالكامل للاستعداد للجولة القادمة
              gameState.isRoundActive = false;
            });

          } else {
            // العصابة أخطأت وصوتت ضد شخص بريء! المحقق يفوز تلقائياً
            catInventory[gameState.detectiveId] = (catInventory[gameState.detectiveId] || 0) + 20;
            await message.channel.send(`🃏 **يا للأسف الشديد!**\nالعصابة أصابها الغباء وصوتت ضد شخص بريء وهو <@${highestVotedId}>!\n\n🏆 **الفائز:** المحقق المتخفي <@${gameState.detectiveId}> استطاع تضليلكم وإرسال الإشارة لباتمان بالوقت المناسب وربح **+20 جوهرة** 💎 لملفه، بينما كان هدف غارتكم هو **「 ${gameState.secretLocation} 」**.`);
            
            gameState.isRoundActive = false;
          }
        });
      });
    });

    return; // الخروج لمنع تشغيل الذكاء الاصطناعي العادي أثناء أمر اللعبة
  }

  // ===================== نظام الغيرة والتدخل التلقائي بنسبة 20% =====================
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

  // تحديد الشخصيات للردود المخصصة
  const isBatman = message.author.id === OWNER_ID;
  const isJoker = message.author.id === JOKER_ID;
  const isCop = message.author.id === COP_ID;
  const isMohammed = message.author.id === MOHAMMED_ID;
  const persona = isBatman ? 'batman' : isJoker ? 'joker' : isCop ? 'cop' : isMohammed ? 'mohammed' : 'others';

  const isMentioned = message.mentions.has(client.user);
  let isReplyToCatwoman = false;
  if (message.reference && message.reference.messageId) {
    try {
      const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
      if (repliedMsg.author.id === client.user.id) isReplyToCatwoman = true;
    } catch (e) {}
  }

  if (!isMentioned && !isReplyToCatwoman) return;

  let userMessage = cleanContent.replace(`<@${client.user.id}>`, '').trim();

  const otherMention = message.mentions.users.find(u => u.id !== client.user.id);
  if (otherMention) {
    const mentionRegex = new RegExp(`<@!?${otherMention.id}>`, 'g');
    userMessage = userMessage.replace(mentionRegex, `[الشخص: ${otherMention.username}]`).trim();
  }

  if (!userMessage) {
    const defaultReply = isBatman ? 'نعم يا بات... أنا هنا' : isJoker ? 'ماذا تريد أيها المهرج؟' : isCop ? 'ماذا تريد أيها الشرطي الفاسد؟' : isMohammed ? 'أهلاً محمد، كيف حالك؟' : `ماذا تريد؟`;
    return message.reply(defaultReply);
  }

  await message.channel.sendTyping();

  // نظام رياكشنات كاتوومان (25% لباتمان و 5% للبقية)
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

  const randomDelay = Math.floor(Math.random() * (3500 - 2000) + 2000);

  setTimeout(async () => {
    let reply = await getCatwomanReply(message.channel.id, message.author.username, userMessage, persona);
    message.reply(reply);
  }, randomDelay);
});

client.login(process.env.DISCORD_TOKEN);