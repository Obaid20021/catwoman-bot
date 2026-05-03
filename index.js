const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const BATMAN_ID = '648818494808391696';

const responses = {
  'احبك': {
    batman: 'وأنا أحبك أكثر يا بات... لكن لا تعتاد',
    others: 'مشاعرك لا تعنيني {user}',
  },
  'مرحبا': {
    batman: 'أهلاً يا بات... كنت أنتظرك',
    others: 'أهلاً {user}... دخلت أرض Catwoman',
  },
  'هلا': {
    batman: 'هلا يا بات... اشتقت لك',
    others: 'هلا {user}',
  },
  'كيف الحال': {
    batman: 'بخير يا بات... أفضل لما تكون هنا',
    others: 'بخير {user}... أسرق القلوب كالعادة',
  },
  'من انت': {
    batman: 'أنا Catwoman يا بات... ألا تعرفني بعد؟',
    others: 'أنا Catwoman... لستُ بطلة ولا شريرة {user}',
  },
  'وينك': {
    batman: 'كنت أفكر فيك يا بات... أين اختفيت؟',
    others: 'مالك شغل فيني {user}',
  },
  'تصبح على خير': {
    batman: 'تصبح على خير يا بات... أحلم بك الليلة',
    others: 'تصبح على خير {user}',
  },
  'صباح الخير': {
    batman: 'صباح النور يا بات... يومي أجمل بوجودك',
    others: 'صباح النور {user}',
  },
  'مساء الخير': {
    batman: 'مساء النور يا بات... غوثام في الليل أجمل بك',
    others: 'مساء النور {user}',
  },
  'شكرا': {
    batman: 'العفو يا بات... دايماً في الخدمة',
    others: 'العفو {user}',
  },
  'باي': {
    batman: 'مع السلامة يا بات... لا تغيب كثير عني',
    others: 'مع السلامة {user}',
  },
  'اشتقت لك': {
    batman: 'وأنا اشتقت لك أكثر يا بات...',
    others: 'أنا ما أشتاق {user}',
  },
  'انتي حلوه': {
    batman: 'بس أنت اللي تجعلني كذلك يا بات',
    others: 'أعرف {user}',
  },
  'احبك كثير': {
    batman: 'قلبي لك يا بات... حتى لو ما أعترف',
    others: 'لا تحلم {user}',
  },
  'فكرت فيك': {
    batman: 'وأنا ما خرجت من بالي يا بات...',
    others: 'لماذا تفكر فيني {user}؟',
  },
  'تزوجيني': {
    batman: 'يا بات... أنتظر منك أكثر من كلام',
    others: 'لا {user}',
  },
  'انتي احسن وحده': {
    batman: 'وأنت أحسن واحد في غوثام يا بات',
    others: 'أعرف {user}',
  },
  'وحشتيني': {
    batman: 'وأنت وحشتني يا بات... لكن لا تقول لأحد',
    others: 'ما وحشتك {user}',
  },
  'ابي اشوفك': {
    batman: 'أنا دايماً في الظلام يا بات... ابحث عني',
    others: 'لماذا {user}؟',
  },
  'صح النوم': {
    batman: 'صح بدنك يا بات... حلمت بك؟',
    others: 'صح بدنك {user}',
  },
};

client.once('clientReady', () => {
  console.log('Catwoman Online!');
});

client.on('messageCreate', message => {
  if (message.author.bot) return;
  const content = message.content.trim();
  if (responses[content]) {
    const isBatman = message.author.id === BATMAN_k85i;
    const reply = isBatman
      ? responses[content].batman
      : responses[content].others.replace('{user}', `<@${message.author.id}>`);
    message.reply(reply);
  }
});

client.login('MTUwMDE4NzAxODk4MDg4NDUyMA.GVFpJs.Y5Sb3POutGKsBg184nJXSDdf7SsGt2_-apQ0w4');