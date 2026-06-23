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

// ===== [قاموس المترجم العكسي للإيموجيات المخصصة] =====
// سيدي بروس، استبدل الأرقام المكتوبة هنا بالـ IDs الفعلية لإيموجيات سيرفرك
const EMOJI_MAP = {
  'CATWOMAN_smile': '<:CATWOMAN_smile:123456789012345678>', 
  'batman_laugh': '<:batman_laugh:876543210987654321>',
  'joker_smile': '<:joker_smile:112233445566778899>'
};

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

قواعد عامة للردود والإيموجي:
- ردكِ يجب أن يكون قصيراً وموجزاً ومباشراً (جملة واحدة أو جملتين فقط، أقل من 20 كلمة إجمالاً).
- تفاعلي مع الأوصاف النصية المرفقة مثل [إيموجي: ...] أو [أرسل صورة متحركة يتعلق بـ ...] وافهمي معناها في سياق الرد.
- إذا أردتِ إرسال إيموجي مخصص في ردكِ، اكتبيه بهذه الصيغة تماماً: [إيموجي: اسم_الإيموجي] مثل [إيموجي: CATWOMAN_smile] أو [إيموجي: batman_laugh] لكي يقوم النظام بتحويله تلقائياً.
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
      max_tokens: 60,
      temperature: 0.5, 
    });

    let reply = completion.choices[0].message.content.trim();

    // المترجم العكسي: تحويل صيغة الأقواس النصية للإيموجي المخصص إلى إيموجي حقيقي بالديسكورد
    for (const [emojiName, emojiCode] of Object.entries(EMOJI_MAP)) {
      const regex = new RegExp(`\\[إيموجي:\\s*${emojiName}\\]`, 'gi');
      reply = reply.replace(regex, emojiCode);
    }
    
    // تنظيف أي منشنات عشوائية أو أقواس أشخاص اخترعها الـ AI
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
      content: `🐾 **اجتماع طوارئ يا لصوص غوثام!**\nوصلني تقرير سري يفيد بأن أحدكم جاسوس متخفي يعمل مع باتمان ليفسد عملياتنا القادمة!\n\n* أمامكم **60 ثانية** لدخول قاعةأمرك سيدي بروس، قمت بجمع الملف بالكامل ودمج القاموس العكسي للإيموجيات بالداخل. 

كل ما عليك فعله الآن هو تعديل الـ IDs الافتراضية التي وضعتها لك في `emojiDictionary` (مثل `112233445566778899`) ووضع الـ IDs الحقيقية لإيموجيات سيرفرك المخصصة لتظهر كصور مباشرة في الديسكورد بدل الأقواس النصية.

### 💻 كود بوت كاتوومان الكامل والنهائي لملف `index.js`:

```javascript
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

قواعد عامة للردود:
- ردكِ يجب أن يكون قصيراً وموجزاً ومباشراً (جملة واحدة أو جملتين فقط، أقل من 20 كلمة إجمالاً).
- تفاعلي مع الأوصاف النصية المرفقة مثل [إيموجي: ...] أو [أرسل صورة متحركة يتعلق بـ ...] وافهمي معناها في سياق الرد.
- إذا أردتِ إرسال إيموجي خاص بكِ أو بباتمان أو الجوكر
