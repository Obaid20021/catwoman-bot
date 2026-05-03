const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const BATMAN_ID = '1418699621986734092';

const responses = {
  'احبك': {
    batman: '😸 وأنا أحبك أكثر يا بات... لكن لا تعتاد 🖤',
    others: '😼 مشاعرك لا تعنيني {user} 🖤',
  },
  'مرحبا': {
    batman: '🐱 أهلاً يا بات... كنت أنتظرك 🖤',
    others: '😼 أهلاً {user}... دخلت أرض Catwoman 🖤',
  },
  'هلا': {
    batman: '😸 هلا يا بات... اشتقت لك 🖤🦇',
    others: '😼 هلا {user} 🐾',
  },
  'كيف الحال': {
    batman: '🐱 بخير يا بات... أفضل لما تكون هنا 🖤',
    others: '😼 بخير {user}... أسرق القلوب كالعادة 🖤',
  },
  'من انت': {
    batman: '😸 أنا Catwoman يا بات... ألا تعرفني بعد؟ 🖤',
    others: '😼 أنا Catwoman... لستُ بطلة ولا شريرة {user} 🖤',
  },
};

client.once('clientReady', () => {
  console.log('✅ Catwoman Online! 🐈‍⬛🖤');
});

client.on('messageCreate', message => {
  if (message.author.bot) return;
  const content = message.content.trim();
  if (responses[content]) {
    const isBatman = message.author.id === BATMAN_ID;
    const reply = isBatman
      ? responses[content].batman
      : responses[content].others.replace('{user}', `<@${message.author.id}>`);
    message.reply(reply);
  }
});

client.login('MTUwMDE4NzAxODk4MDg4NDUyMA.GJ_eky.RV6cWNFA5XzEeM3me06c_ueQg1fXge1TLIVpqw');