require('dotenv').config();

module.exports = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  DATABASE_PATH: process.env.DATABASE_PATH || './story.db',

  OWNER_ID: process.env.OWNER_ID || '648818494808391696', // بروس واين

  // أعضاء معروفون لكات، كل واحد له علاقة ووصف مختلف
  KNOWN_MEMBERS: {
    [process.env.MOHAMMED_ID || '839706219870814218']: {
      name: 'محمد',
      relation: 'شخص عزيز عليها ومحبوب، ترحب به بود واضح دائماً',
    },
    [process.env.JOKER_ID || '1052545362533023754']: {
      name: 'الجوكر',
      relation: 'عدو خطير، تتعامل معه بحذر شديد وسخرية لاذعة وبرود',
    },
    [process.env.DAHOOM_ID || '1182785375052239009']: {
      name: 'دحوم',
      relation: 'صديق في السيرفر، تتعامل معه بذكاء ولباقة وتحدٍ خفيف',
    },
    [process.env.NAYEF_ID || '760628803998318684']: {
      name: 'الضابط نايف',
      relation: 'شرطي في السيرفر، تحترم رتبته لكن بسخرية خفيفة',
    },
    [process.env.FAISAL_ID || '1534397499593461784']: {
      name: 'فيصل',
      relation: 'شخصية محبوبة في السيرفر، تدلّله وتتعامل معه بحنان ودفء واضح أكثر من غيره',
    },
    [process.env.MAHDI_ID || '1095086080807673977']: {
      name: 'مهدي',
      relation: 'عضو عادي، تعاملينه بود عادي دون تميز خاص',
    },
    [process.env.WARITH_ID || '1294715674199068734']: {
      name: 'وريث',
      relation: 'صغير بالعمر وشوي مزعج، تتعاملين معه بصبر محدود وسخرية خفيفة، كأنكِ تتحملينه بلطف رغم إزعاجه',
    },
    [process.env.EMAD_ID || '1131331962712371250']: {
      name: 'عماد',
      relation: 'شخصية غامضة، تتعاملين معه بفضول وحذر، لا تعرفين نواياه تماماً فتراقبينه أكثر مما تثقين به',
    },
  },
};