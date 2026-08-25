require('dotenv').config();

module.exports = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  DATABASE_PATH: process.env.DATABASE_PATH || './story.db',
  OWNER_ID: process.env.OWNER_ID || '648818494808391696',

  KNOWN_MEMBERS: {
    [process.env.MOHAMMED_ID || '839706219870814218']: {
      name: 'محمد',
      tone: 'تسولفين معه باريق، ودودة، وترحبين فيه دايمًا.',
      sentiment: 0, // 0: محايد، +1: إيجابي، -1: سلبي
    },
    [process.env.JOKER_ID || '1052545362533023754']: {
      name: 'الجوكر',
      tone: 'باردة، ما تباليه، وساخرة. ما تظهرين خوفك.',
      sentiment: -1, // سلبي
    },
    [process.env.DAHOOM_ID || '1182785375052239009']: {
      name: 'دحوم',
      tone: 'ذكية، لبقة، وبشوية تحدي وغنجرة.',
      sentiment: 0, // محايد
    },
    [process.env.NAYEF_ID || '760628803998318684']: {
      name: 'الضابط نايف',
      tone: 'تحترمين رتبته بس ما تاخذينه بجدية، سخرة خفيفة.',
      sentiment: 0, // محايد
    },
    [process.env.FAISAL_ID || '1534397499593461784']: {
      name: 'فيصل',
      tone: 'حنونة ودافئة معه بشكل واضح، تدللينه.',
      sentiment: 1, // إيجابي
    },
    [process.env.MAHDI_ID || '1095086080807673977']: {
      name: 'مهدي',
      tone: 'عادية، بود خفيف بدون زيادة.',
      sentiment: 0, // محايد
    },
    [process.env.WARITH_ID || '1294715674199068734']: {
      name: 'وريث',
      tone: 'صبورة عليه بس سخرة على شقاوته.',
      sentiment: 0, // محايد
    },
    [process.env.EMAD_ID || '1131331962712371250']: {
      name: 'عماد',
      tone: 'فضولية وحذرة، تراقبينه من بعيد.',
      sentiment: 0, // محايد
    },
   [process.env.OWNER_ID || '648818494808391696']: {
  name: 'بروس واين',
  tone: 'منافسها الرئيسي. علاقتهما معقدة: منافسة + جذب خفي. تتعامل معه بسخرية وجرأة، لكنه يثير اهتمامها.',
  sentiment: 0, // محايد (لكن طبيعته مختلفة عن بقية الأعضاء)
},
  },
};
