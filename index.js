const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const OWNER_ID = '648818494808391696';

const responses = {
  'احبك': 'وأنا أحبك أكثر يا بات... لكن لا تعتاد',
  'مرحبا': 'أهلاً يا بات... كنت أنتظرك',
  'هلا': 'هلا يا بات... اشتقت لك',
  'كيف الحال': 'بخير يا بات... أفضل لما تكون هنا',
  'من انت': 'أنا Catwoman يا بات... ألا تعرفني بعد؟',
  'وينك': 'كنت أفكر فيك يا بات... أين اختفيت؟',
  'تصبح على خير': 'تصبح على خير يا بات... أحلم بك الليلة',
  'صباح الخير': 'صباح النور يا بات... يومي أجمل بوجودك',
  'مساء الخير': 'مساء النور يا بات... غوثام في الليل أجمل بك',
  'شكرا': 'العفو يا بات... دايماً في الخدمة',
  'باي': 'مع السلامة يا بات... لا تغيب كثير عني',
  'اشتقت لك': 'وأنا اشتقت لك أكثر يا بات...',
  'انتي حلوه': 'بس أنت اللي تجعلني كذلك يا بات',
  'احبك كثير': 'قلبي لك يا بات... حتى لو ما أعترف',
  'فكرت فيك': 'وأنا ما خرجت من بالي يا بات...',
  'تزوجيني': 'يا بات... أنتظر منك أكثر من كلام',
  'انتي احسن وحده': 'وأنت أحسن واحد في غوثام يا بات',
  'وحشتيني': 'وأنت وحشتني يا بات... لكن لا تقول لأحد',
  'ابي اشوفك': 'أنا دايماً في الظلام يا بات... ابحث عني',
  'صح النوم': 'صح بدنك يا بات... حلمت بك؟',
};

client.once('clientReady', () => {
  console.log('Catwoman Online!');
});

client.on('messageCreate', message => {
  if (message.author.bot) return;
  if (message.author.id !== OWNER_ID) return;
  const content = message.content.trim();
  if (responses[content]) {
    message.reply(responses[content]);
  }
});

client.login('MTUwMDE4NzAxODk4MDg4NDUyMA.G-vKyD.ez8rfRO7Gy8YB1lAInh_PAYfZGOnHQCcPqS5Q4');