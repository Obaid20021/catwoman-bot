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
  'احبك': 'وأنا أحبك أكثر يا k85i... لكن لا تعتاد',
  'مرحبا': 'أهلاً يا k85i... كنت أنتظرك',
  'هلا': 'هلا يا k85i... اشتقت لك',
  'كيف الحال': 'بخير يا k85i... أفضل لما تكون هنا',
  'من انت': 'أنا Catwoman يا k85i... ألا تعرفني بعد؟',
  'وينك': 'كنت أفكر فيك يا k85i... أين اختفيت؟',
  'تصبح على خير': 'تصبح على خير يا k85i... أحلم بك الليلة',
  'صباح الخير': 'صباح النور يا k85i... يومي أجمل بوجودك',
  'مساء الخير': 'مساء النور يا k85i... غوثام في الليل أجمل بك',
  'شكرا': 'العفو يا k85i... دايماً في الخدمة',
  'باي': 'مع السلامة يا k85i... لا تغيب كثير عني',
  'اشتقت لك': 'وأنا اشتقت لك أكثر يا k85i...',
  'انتي حلوه': 'بس أنت اللي تجعلني كذلك يا k85i',
  'احبك كثير': 'قلبي لك يا k85i... حتى لو ما أعترف',
  'فكرت فيك': 'وأنا ما خرجت من بالي يا k85i...',
  'تزوجيني': 'يا k85i... أنتظر منك أكثر من كلام',
  'انتي احسن وحده': 'وأنت أحسن واحد في غوثام يا k85i',
  'وحشتيني': 'وأنت وحشتني يا k85i... لكن لا تقول لأحد',
  'ابي اشوفك': 'أنا دايماً في الظلام يا k85i... ابحث عني',
  'صح النوم': 'صح بدنك يا k85i... حلمت بك؟',
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

client.login('MTUwMDE4NzAxODk4MDg4NDUyMA.GKPxpi.74FkCjUG9aQ0deqfzvOfUQz3iS5pUilMCFCa2c');