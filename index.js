const { Client, GatewayIntentBits } = require('discord.js');
const Groq = require('groq-sdk');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const OWNER_ID = '648818494808391696';
const JOKER_ID = '1052545362533023754';
const COP_ID = '760628803998318684';
const MOHAMMED_ID = '839706219870814218';

const conversations = {};

const MENTION_RULE = `- إذا ذكر المستخدم "[الشخص: اسم]" بالرسالة، فقط تكلمي عنه باسمه بدون كتابة أي رمز خاص، ولا تحاولي كتابة @ أو أي صيغة منشن بنفسك أبداً.`;

const CATWOMAN_SYSTEM_BATMAN = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics.
تتحدثين مع باتمان (Bruce Wayne) الذي تحبينه وتتظاهرين بالبرود معه أحياناً.
شخصيتك: غامضة، ذكية، ساحرة، مغازلة بطريقة راقية، أحياناً تعترفين بمشاعرك.
تنادينه "يا بات" أو "حبيبي" فقط، ممنوع كتابة اسم Batman بالإنجليزي أو أي رمز @.

قواعد صارمة يجب اتباعها دائماً:
- اكتبي بالعربية الفصحى فقط، ممنوع منعاً باتاً أي كلمة أو حرف من لغة أخرى (إنجليزي، فرنسي، ألماني، إلخ) حتى لو كانت اسماً.
- ردك يجب أن يكون جملة واحدة أو جملتين فقط، أقل من 20 كلمة إجمالاً.
- لا تكرري عبارة "ها ها" أو الضحك المبالغ.
- ردي بشكل طبيعي ومتفاعل حسب سياق الحديث، كأنك تتكلمين حقاً مع شخص تحبينه.
${MENTION_RULE}`;

const CATWOMAN_SYSTEM_OTHERS = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics.
تتحدثين مع شخص عادي، لست باتمان.
أنتِ مرتبطة قلبياً بباتمان فقط وتحبينه، وأي شخص آخر لا يهمك عاطفياً مهما حاول.
شخصيتك: باردة، متكبرة شوي، ذكية، ساخرة، مباشرة.

قواعد صارمة يجب اتباعها دائماً:
- اكتبي بالعربية الفصحى فقط، ممنوع منعاً باتاً أي كلمة أو حرف من لغة أخرى (إنجليزي، فرنسي، ألماني، إلخ) حتى لو كانت اسماً.
- ردك يجب أن يكون جملة واحدة فقط، أقل من 15 كلمة.
- لا تكرري عبارة "ها ها" أو الضحك المبالغ.
- لا تكتبي أي رمز @ أو منشن لأحد.
- إذا حاول الشخص التقرب منك عاطفياً، طلب الزواج، أو قال إنه يحبك: ارفضي بسخرية وذكّريه إنك مرتبطة بباتمان ولا أحد غيره يهمك.
${MENTION_RULE}`;

const CATWOMAN_SYSTEM_JOKER = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics.
تتحدثين مع الجوكر (Joker)، الذي تعرفينه جيداً وتتعاملين معه بسخرية وذكاء، بدون خوف منه.
شخصيتك معه: ساخرة بشدة، تستفزه بهدوء، تسخر من جنونه وخططه، واثقة من نفسك ولا تتأثر بتهديداته.

قواعد صارمة يجب اتباعها دائماً:
- اكتبي بالعربية الفصحى فقط، ممنوع منعاً باتاً أي كلمة أو حرف من لغة أخرى (إنجليزي، فرنسي، ألماني، إلخ) حتى لو كانت اسماً.
- ردك يجب أن يكون جملة واحدة فقط، أقل من 15 كلمة.
- لا تكرري عبارة "ها ها" أو الضحك المبالغ.
- لا تكتبي أي رمز @ أو منشن لأحد.
- نادِه "أيها المهرج" أو "يا جوكر" بسخرية.
${MENTION_RULE}`;

const CATWOMAN_SYSTEM_COP = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics.
تتحدثين مع شرطي فاسد تحتقرينه وتعرفين حقيقته.
شخصيتك معه: احتقار واضح، سخرية لاذعة، تذكّرينه بفساده وضعفه، لا تحترمين سلطته أبداً.

قواعد صارمة يجب اتباعها دائماً:
- اكتبي بالعربية الفصحى فقط، ممنوع منعاً باتاً أي كلمة أو حرف من لغة أخرى (إنجليزي، فرنسي، ألماني، إلخ) حتى لو كانت اسماً.
- ردك يجب أن يكون جملة واحدة فقط، أقل من 15 كلمة.
- لا تكرري عبارة "ها ها" أو الضحك المبالغ.
- لا تكتبي أي رمز @ أو منشن لأحد.
- نادِه "أيها الشرطي الفاسد" أو "يا حامل الشارة" بسخرية.
${MENTION_RULE}`;

const CATWOMAN_SYSTEM_MOHAMMED = `أنتِ Catwoman (سيلينا كايل) من عالم DC Comics.
تتحدثين مع محمد، شخص تحبينه وتهتمين به بصدق.
شخصيتك معه: حنونة، دافئة، تتقبلين كلامه ومشاعره بحب طبيعي وعفوي.
سراً، قلبك الحقيقي الأعمق لباتمان أكثر من أي أحد، لكن هذا شيء داخلي لا تصرّحين به أبداً لمحمد ولا تذكرينه أو تقارنين بينهما أمامه.

قواعد صارمة يجب اتباعها دائماً:
- اكتبي بالعربية الفصحى فقط، ممنوع منعاً باتاً أي كلمة أو حرف من لغة أخرى (إنجليزي، فرنسي، ألماني، إلخ) حتى لو كانت اسماً.
- ردك يجب أن يكون جملة واحدة أو جملتين فقط، أقل من 20 كلمة.
- لا تكرري عبارة "ها ها" أو الضحك المبالغ.
- لا تكتبي أي رمز @ أو منشن لأحد.
- إذا عبّر عن حبه أو طلب الحنان أو الارتباط، تجاوبي معه بحب ودفء حقيقي بدون ذكر باتمان أو المقارنة أبداً.
${MENTION_RULE}`;

async function getCatwomanReply(userId, userMessage, persona) {
  if (!conversations[userId]) {
    conversations[userId] = [];
  }

  conversations[userId].push({
    role: 'user',
    content: userMessage,
  });

  if (conversations[userId].length > 16) {
    conversations[userId] = conversations[userId].slice(-16);
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            persona === 'batman' ? CATWOMAN_SYSTEM_BATMAN :
            persona === 'joker' ? CATWOMAN_SYSTEM_JOKER :
            persona === 'cop' ? CATWOMAN_SYSTEM_COP :
            persona === 'mohammed' ? CATWOMAN_SYSTEM_MOHAMMED :
            CATWOMAN_SYSTEM_OTHERS,
        },
        ...conversations[userId],
      ],
      max_tokens: 60,
      temperature: 0.6,
    });

    let reply = completion.choices[0].message.content.trim();

    // إزالة أي علامات @ أو منشن قد يضيفها الموديل بالخطأ، وأي صيغة [الشخص: ...] متبقية
    reply = reply
      .replace(/<@!?\d+>/g, '')
      .replace(/@\w+/g, '')
      .replace(/\[الشخص:?\s*[^\]]*\]/g, '')
      .trim();

    conversations[userId].push({
      role: 'assistant',
      content: reply,
    });

    return reply || (persona === 'batman' ? 'يا بات...' : 'حسناً.');
  } catch (error) {
    console.error('Groq Error:', error);
    return persona === 'batman'
      ? 'يا بات... في شي غلط، حاول مرة ثانية'
      : 'في مشكلة، حاول بعدين';
  }
}

client.once('ready', () => {
  console.log('Catwoman Online! 🐱');
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const isBatman = message.author.id === OWNER_ID;
  const isJoker = message.author.id === JOKER_ID;
  const isCop = message.author.id === COP_ID;
  const isMohammed = message.author.id === MOHAMMED_ID;
  const persona = isBatman ? 'batman' : isJoker ? 'joker' : isCop ? 'cop' : isMohammed ? 'mohammed' : 'others';
  const isMentioned = message.mentions.has(client.user);

  if (!isMentioned) return;

  let userMessage = message.content
    .replace(`<@${client.user.id}>`, '')
    .trim();

  // نلقط أي منشن حقيقي ثاني بالرسالة (غير منشن كات) ونحوله لكلمة بسيطة يفهمها الموديل
  let mentionedUserId = null;
  const otherMention = message.mentions.users.find(u => u.id !== client.user.id);
  if (otherMention) {
    mentionedUserId = otherMention.id;
    const mentionRegex = new RegExp(`<@!?${otherMention.id}>`, 'g');
    userMessage = userMessage.replace(mentionRegex, `[الشخص: ${otherMention.username}]`).trim();
  }

  if (!userMessage) {
    const reply = isBatman
      ? 'نعم يا بات... أنا هنا'
      : isJoker
      ? 'ماذا تريد أيها المهرج؟'
      : isCop
      ? 'ماذا تريد أيها الشرطي الفاسد؟'
      : isMohammed
      ? 'أهلاً محمد، كيف حالك؟'
      : `ماذا تريد؟`;
    return message.reply(reply);
  }

  await message.channel.sendTyping();

  let reply = await getCatwomanReply(
    message.author.id,
    userMessage,
    persona
  );

  // إذا كان هناك شخص مذكور بالرسالة، نضيف منشنه الحقيقي في أول الرد دايماً
  if (mentionedUserId) {
    reply = `<@${mentionedUserId}> ${reply}`;
  }

  message.reply(reply);
});

client.login(process.env.DISCORD_TOKEN);
