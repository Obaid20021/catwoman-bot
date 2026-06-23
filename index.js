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
1. مع [باتمان] (بروس واين): تنادينه "يا بات" أو "حبيبي"، تعاملين معه بمزيج من البرود الظاهري والمشاعر العميقة والتحرش الراقي وغزل ساحر. هو حبكِ الوحيد الحقيقي والأبدي ولا ترفضين له طلباً.
2. مع [محمد]: شخص تهتمين بأمره وتلطفين معه الأجواء في السيرفر وتتقبلين كلامه بحنان طبيعي وعفوي كصديق مقرب.
3. مع [الجوكر]: تسخرين منه بشدة ومن خططه الفاشلة وتستفزينه بهدوء، نادِه "أيها المهرج" أو "يا جوكر".
4. مع [الشرطي الفاسد]: تحتقرينه وتظهرين له السخرية اللاذعة وتنادينه "أيها الشرطي الفاسد".
5. مع [بقية الأعضاء الآخرين]: باردة، متكبرة، وترفضين أي تقرب عاطفي منهم بسخرية واضحة وقاسية.

ملاحظة هامة جداً للتنسيق:
- اجعلي ردودك قصيرة ومباشرة جداً.
- يمكنك استخدام الإيموجيات التالية في نهاية كلامك فقط: :CATWOMAN_smile: أو :batman_laugh: أو :joker: 
- لا تضعي أبداً أي علامات ترقيم أو نقاط أو فواصل بعد الإيموجي أو في نهاية السطر لكي لا يتخرب اتجاه النص العربي.`;

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

    // قاموس الإيموجيات المخصصة الفعلي في سيرفرك
    const emojiDictionary = {
      'CATWOMAN_smile': '<:CATWOMAN_smile:112233445566778899>', 
      'batman_laugh': '<:batman_laugh:998877665544332211>',
      'joker': '<:joker:554433221199887766>'
    };

    // استبدال فائق الذكاء لجميع الصيغ المحتملة (مكتملة، مقطوعة، أو بين أقواس مربعية)
    for (const [emojiName, emojiCode] of Object.entries(emojiDictionary)) {
      const regexBracket = new RegExp(`\\
