require('dotenv').config();

module.exports = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  DATABASE_PATH: process.env.DATABASE_PATH || './story.db',
};